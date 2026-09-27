import { api, esCancelacion, soloUltima } from "../api.js";
import { byId, delegar, html, notificar, render } from "../utils/dom.js";
import { debounce, formatFecha, formatPrecio, FORMATO_FECHA } from "../utils/format.js";

let el = {};

const pedirTurnos = soloUltima((signal, filtros) => api.turnos.listar(filtros, { signal }));

function leerFiltros() {
  return {
    fecha: el.fecha.value,
    nombre: el.nombre.value.trim(),
    telefono: el.telefono.value.trim(),
    cancha_id: el.cancha.value,
  };
}

async function cargarTurnos() {
  try {
    const { turnos } = await pedirTurnos(leerFiltros());
    renderTurnos(turnos);
  } catch (error) {
    if (!esCancelacion(error)) notificar("error", `No se pudieron cargar los turnos: ${error.message}`);
  }
}

const cargarTurnosDebounced = debounce(cargarTurnos, 300);

function renderTurnos(turnos) {
  if (!turnos.length) {
    render(el.lista, html`<div class="empty-state">Sin turnos encontrados.</div>`);
    return;
  }
  render(
    el.lista,
    html`<div class="turno-row header" aria-hidden="true">
        <span>Fecha</span><span>Hora</span><span>Cancha</span><span>Cliente</span>
        <span>Teléfono</span><span>Precio</span><span></span>
      </div>
      <ul class="turnos-list">
        ${turnos.map(
          (t) => html`<li class="turno-row">
            <span class="t-fecha">${formatFecha(t.fecha, FORMATO_FECHA.tabla)}</span>
            <span class="t-hora">${t.hora}</span>
            <span class="t-cancha" title="${t.cancha_nombre}">${t.cancha_nombre}</span>
            <span class="t-cliente">${t.nombre} ${t.apellido}</span>
            <span class="t-tel">${t.telefono}</span>
            <span class="t-precio">${formatPrecio(t.precio)}</span>
            <span class="t-acciones">
              <button type="button" class="btn btn-danger btn-sm" data-id="${t.id}"
                aria-label="Eliminar turno de ${t.nombre} ${t.apellido} (${t.fecha} ${t.hora})">
                Eliminar
              </button>
            </span>
          </li>`,
        )}
      </ul>`,
  );
}

async function eliminarTurno(boton) {
  if (!confirm("¿Eliminar este turno?")) return;
  boton.disabled = true;
  try {
    await api.turnos.eliminar(boton.dataset.id);
    notificar("success", "Turno eliminado.");
    await cargarTurnos();
  } catch (error) {
    boton.disabled = false;
    notificar("error", error.message);
  }
}

async function cargarCanchasFiltro() {
  try {
    const { canchas } = await api.canchas.listar();
    const actual = el.cancha.value;
    // Se incluyen las inactivas para poder filtrar turnos históricos.
    render(
      el.cancha,
      html`<option value="">Todas</option>
        ${canchas.map(
          (c) => html`<option value="${c.id}">${c.nombre}${c.activa ? "" : " (inactiva)"}</option>`,
        )}`,
    );
    el.cancha.value = canchas.some((c) => String(c.id) === actual) ? actual : "";
  } catch (error) {
    notificar("error", error.message);
  }
}

export function init() {
  el = {
    form: byId("form-filtros"),
    fecha: byId("filtro-fecha"),
    nombre: byId("filtro-nombre"),
    telefono: byId("filtro-tel"),
    cancha: byId("filtro-cancha"),
    lista: byId("turnos-container"),
  };

  // Texto: con debounce. Fecha y cancha: al instante.
  el.nombre.addEventListener("input", cargarTurnosDebounced);
  el.telefono.addEventListener("input", cargarTurnosDebounced);
  el.fecha.addEventListener("change", cargarTurnos);
  el.cancha.addEventListener("change", cargarTurnos);
  el.form.addEventListener("submit", (e) => e.preventDefault());
  el.form.addEventListener("reset", () => setTimeout(cargarTurnos)); // tras limpiar los campos

  delegar(el.lista, "click", "button[data-id]", (_, boton) => eliminarTurno(boton));
}

export async function mount() {
  await cargarCanchasFiltro();
  await cargarTurnos();
}
