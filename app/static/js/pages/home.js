import { api } from "../api.js";
import { byId, html, notificar, render } from "../utils/dom.js";
import { capitalizar, formatHora, formatPrecio, FORMATO_FECHA } from "../utils/format.js";

let relojId = null;
let el = {};

function actualizarReloj() {
  const ahora = new Date();
  el.reloj.textContent = formatHora(ahora);
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
            <div class="proximo-det">${proximo.telefono} · ${proximo.cancha_nombre}</div>
          </div>
          <div class="proximo-badge">⚽ En cancha pronto</div>
        </div>`
      : html`<div class="proximo-card">
          <div class="sin-proximo">No quedan más turnos programados para hoy.</div>
        </div>`,
  );
}

function celdaTimeline(turno, pasado) {
  if (!turno) {
    return html`<td><div class="tl-slot-libre">${pasado ? "" : "Libre"}</div></td>`;
  }
  return html`<td>
    <div class="tl-slot-ocupado ${pasado ? "pasado" : ""}">
      <div class="tl-slot-nombre" title="${turno.nombre} ${turno.apellido}">
        ${turno.nombre} ${turno.apellido}
      </div>
      <div class="tl-slot-precio">${formatPrecio(turno.precio)}</div>
    </div>
  </td>`;
}

function renderTimeline({ canchas, turnos_hoy, hora_actual, horarios }) {
  if (!canchas.length) {
    render(el.timeline, html`<tbody><tr><td class="empty-state">No hay canchas activas.</td></tr></tbody>`);
    return;
  }

  const porSlot = new Map(turnos_hoy.map((t) => [`${t.hora}_${t.cancha_id}`, t]));
  const proximaHora = turnos_hoy.find((t) => t.hora >= hora_actual)?.hora;

  const filas = horarios.map((hora) => {
    const pasado = hora < hora_actual;
    const claseHora = pasado ? "pasado" : hora === proximaHora ? "activo" : "";
    return html`<tr>
      <td class="tl-hora-cell ${claseHora}">${hora}</td>
      ${canchas.map((c) => celdaTimeline(porSlot.get(`${hora}_${c.id}`), pasado))}
    </tr>`;
  });

  render(
    el.timeline,
    html`<thead>
        <tr><th scope="col">Hora</th>${canchas.map((c) => html`<th scope="col">${c.nombre}</th>`)}</tr>
      </thead>
      <tbody>${filas}</tbody>`,
  );
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
          <span class="manana-cancha">${t.cancha_nombre}</span>
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
  };
}

export async function mount() {
  actualizarReloj();
  clearInterval(relojId);
  relojId = setInterval(actualizarReloj, 1000);

  try {
    const data = await api.home();
    renderStats(data);
    renderProximo(data.proximo);
    renderTimeline(data);
    renderManana(data.turnos_manana);
  } catch (error) {
    notificar("error", `No se pudo cargar el inicio: ${error.message}`);
  }
}

export function unmount() {
  clearInterval(relojId);
}
