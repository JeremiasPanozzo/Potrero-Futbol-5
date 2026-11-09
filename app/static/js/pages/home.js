import { api } from "../api.js";
import { byId, html, mostrar, notificar, ocultar, render } from "../utils/dom.js";
import { claseCancha } from "../utils/canchas.js";
import { capitalizar, formatHora, formatPrecio, FORMATO_FECHA } from "../utils/format.js";

let relojId = null;
let el = {};

function actualizarReloj() {
  const ahora = new Date();
  el.reloj.textContent = formatHora(ahora);
  // Cada minuto nuevo se recalcula la agenda (qué pasó, qué está en juego).
  if (agenda && ahora.getMinutes() !== ultimoMinuto) renderTimeline();
  ultimoMinuto = ahora.getMinutes();
  el.dia.textContent = capitalizar(ahora.toLocaleDateString("es-AR", { weekday: "long" }));
  el.fecha.textContent = ahora
    .toLocaleDateString("es-AR", FORMATO_FECHA.completa)
    .toUpperCase();
}

function renderStats(data) {
  el.statReservados.textContent = data.turnos_hoy.length;
  el.statLibres.textContent = data.libres_hoy;
  el.statRecaudacion.textContent = formatPrecio(data.recaudacion_hoy);
  el.statHistorico.textContent = data.total_historico;
}

function renderProximo(proximo) {
  render(
    el.proximo,
    proximo
      ? html`<div class="proximo-card">
          <div>
            <div class="proximo-label">Próximo turno</div>
            <div class="proximo-hora">${proximo.hora} hs</div>
            <div class="proximo-cliente">${proximo.nombre} ${proximo.apellido}</div>
            <div class="proximo-det">${proximo.telefono} · <span class="cancha-tag ${claseCancha(proximo.cancha_id)}">${proximo.cancha_nombre}</span></div>
          </div>
          <div class="proximo-badge">⚽ En cancha pronto</div>
        </div>`
      : html`<div class="proximo-card">
          <div class="sin-proximo">No quedan más turnos programados para hoy.</div>
        </div>`,
  );
}

// ── Agenda de hoy con línea de "ahora" ──────────────────────────

const DURACION_TURNO = 60; // minutos
const aMinutos = (hora) => {
  const [hh, mm] = hora.split(":").map(Number);
  return hh * 60 + mm;
};
const minutosAhora = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

/** "pasado" (terminó), "en-juego" (se está jugando), "futuro". */
function estadoHorario(hora, ahora) {
  const inicio = aMinutos(hora);
  if (ahora >= inicio + DURACION_TURNO) return "pasado";
  if (ahora >= inicio) return "en-juego";
  return "futuro";
}

const ETIQUETAS = { "en-juego": "En juego", proximo: "Sigue" };

function celdaTimeline(turno, estado) {
  if (!turno) {
    return html`<td><div class="tl-slot-libre">${estado === "pasado" ? "" : "Libre"}</div></td>`;
  }
  const etiqueta = ETIQUETAS[estado];
  return html`<td>
    <div class="tl-slot-ocupado ${claseCancha(turno.cancha_id)} ${estado}">
      ${etiqueta ? html`<span class="tl-badge">${etiqueta}</span>` : ""}
      <div class="tl-slot-nombre" title="${turno.nombre} ${turno.apellido}">
        ${turno.nombre} ${turno.apellido}
      </div>
      <div class="tl-slot-precio">${formatPrecio(turno.precio)}</div>
    </div>
  </td>`;
}

let agenda = null; // último { canchas, turnos_hoy, horarios } recibido
let ultimoMinuto = null;

function renderTimeline() {
  const { canchas, turnos_hoy, horarios } = agenda;
  if (!canchas.length) {
    render(el.timeline, html`<tbody><tr><td class="empty-state">No hay canchas activas.</td></tr></tbody>`);
    ocultar(el.lineaAhora);
    return;
  }

  const ahora = minutosAhora();
  const porSlot = new Map(turnos_hoy.map((t) => [`${t.hora}_${t.cancha_id}`, t]));
  // Próximos: los turnos del primer horario que todavía no empezó.
  const horaProxima = turnos_hoy.find((t) => aMinutos(t.hora) > ahora)?.hora;

  const filas = horarios.map((hora) => {
    const estado = estadoHorario(hora, ahora);
    const estadoCelda = hora === horaProxima ? "proximo" : estado;
    return html`<tr data-hora="${hora}" class="tl-fila-${estado}">
      <td class="tl-hora-cell ${estado}">${hora}</td>
      ${canchas.map((c) => celdaTimeline(porSlot.get(`${hora}_${c.id}`), estadoCelda))}
    </tr>`;
  });

  render(
    el.timeline,
    html`<thead>
        <tr><th scope="col">Hora</th>${canchas.map((c) => html`<th scope="col"><span class="cancha-dot ${claseCancha(c.id)}"></span>${c.nombre}</th>`)}</tr>
      </thead>
      <tbody>${filas}</tbody>`,
  );
  posicionarLineaAhora();
}

/** Ubica la línea verde dentro de la fila del horario actual. */
function posicionarLineaAhora() {
  const ahora = minutosAhora();
  const filas = [...el.timeline.tBodies[0]?.rows ?? []].filter((f) => f.dataset.hora);
  const fila = filas.find((f) => estadoHorario(f.dataset.hora, ahora) === "en-juego");

  if (!fila) {
    ocultar(el.lineaAhora); // fuera del horario de la agenda
    return;
  }

  const fraccion = (ahora - aMinutos(fila.dataset.hora)) / DURACION_TURNO;
  const wrap = el.lineaAhora.parentElement.getBoundingClientRect();
  const caja = fila.getBoundingClientRect();
  el.lineaAhora.style.top = `${caja.top - wrap.top + fraccion * caja.height}px`;
  mostrar(el.lineaAhora);
}

function renderManana(turnos) {
  if (!turnos.length) {
    render(el.manana, html`<div class="empty-state">Sin turnos para mañana.</div>`);
    return;
  }
  render(
    el.manana,
    html`<ul class="manana-list">
      ${turnos.map(
        (t) => html`<li class="manana-row">
          <span class="manana-hora">${t.hora}</span>
          <span class="manana-cancha cancha-tag ${claseCancha(t.cancha_id)}">${t.cancha_nombre}</span>
          <span class="manana-nombre">${t.nombre} ${t.apellido}</span>
        </li>`,
      )}
    </ul>`,
  );
}

export function init() {
  el = {
    dia: byId("home-dia"),
    fecha: byId("home-fecha-completa"),
    reloj: byId("home-reloj"),
    statReservados: byId("stat-reservados"),
    statLibres: byId("stat-libres"),
    statRecaudacion: byId("stat-recaudacion"),
    statHistorico: byId("stat-historico"),
    proximo: byId("home-proximo"),
    timeline: byId("home-timeline"),
    manana: byId("home-manana"),
    lineaAhora: byId("tl-ahora"),
  };
  window.addEventListener("resize", () => agenda && posicionarLineaAhora());
}

export async function mount() {
  actualizarReloj();
  clearInterval(relojId);
  relojId = setInterval(actualizarReloj, 1000);

  try {
    const data = await api.home();
    renderStats(data);
    renderProximo(data.proximo);
    agenda = data;
    renderTimeline();
    renderManana(data.turnos_manana);
  } catch (error) {
    notificar("error", `No se pudo cargar el inicio: ${error.message}`);
  }
}

export function unmount() {
  clearInterval(relojId);
}
