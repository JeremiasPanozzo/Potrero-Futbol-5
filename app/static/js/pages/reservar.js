import { api, esCancelacion, soloUltima } from "../api.js";
import {
  byId,
  conBotonOcupado,
  delegar,
  html,
  mostrar,
  mostrarAlerta,
  $$,
  notificar,
  ocultar,
  render,
} from "../utils/dom.js";
import { debounce, formatFecha, formatPrecio, FORMATO_FECHA, sumarHoras } from "../utils/format.js";

const MIN_DIGITOS_TELEFONO = 8;

// Estado del flujo de reserva (fecha → hora → cancha → cliente).
const estado = {
  fecha: null,
  slots: new Map(), // hora → [{ cancha_id, cancha_nombre, disponible }]
  hora: null,
  cancha: null,
  cliente: null, // cliente existente encontrado por teléfono
};

let el = {};

// ── Paso 1: fecha y horario ──────────────────────────────────────

const pedirDisponibilidad = soloUltima((signal, fecha) =>
  api.disponibilidad.porFecha(fecha, { signal }),
);

function renderHorarios() {
  const slots = [...estado.slots.entries()];
  render(
    el.grid,
    slots.map(([hora, canchas]) => {
      const libres = canchas.filter((c) => c.disponible).length;
      const disponible = libres > 0;
      const seleccionado = hora === estado.hora;
      return html`<button
        type="button"
        class="slot ${disponible ? "libre" : "ocupado"} ${seleccionado ? "seleccionado" : ""}"
        data-hora="${hora}"
        aria-pressed="${String(seleccionado)}"
        ${disponible ? "" : html`disabled`}
      >
        ${hora}
        ${disponible && canchas.length > 1
          ? html`<span class="slot-libres-count">${libres}/${canchas.length} libres</span>`
          : ""}
      </button>`;
    }),
  );
  mostrar(el.horarioWrap);
}

/** Trae la disponibilidad de la fecha y redibuja la grilla. */
async function cargarHorarios(fecha) {
  try {
    const data = await pedirDisponibilidad(fecha);
    estado.fecha = fecha;
    estado.slots = new Map(data.slots.map((s) => [s.hora, s.canchas]));
    renderHorarios();
    return true;
  } catch (error) {
    if (!esCancelacion(error)) notificar("error", error.message);
    return false;
  }
}

async function alCambiarFecha() {
  const fecha = el.fecha.value;
  limpiarSeleccion();
  ocultar(el.resultado);
  if (!fecha) {
    ocultar(el.horarioWrap);
    return;
  }
  await cargarHorarios(fecha);
}

// ── Paso 2: cancha ───────────────────────────────────────────────

function seleccionarHora(hora) {
  const canchas = estado.slots.get(hora);
  if (!canchas?.some((c) => c.disponible)) return;

  estado.hora = hora;
  estado.cancha = null;
  renderHorarios();

  render(
    el.horaInfo,
    html`<strong>${formatFecha(estado.fecha)}</strong> a las <strong>${hora} hs</strong> — Elegí la cancha:`,
  );
  render(
    el.canchaPicker,
    canchas.map(
      (c) => html`<button
        type="button"
        class="cancha-btn ${c.disponible ? "" : "ocupada"}"
        data-cancha-id="${c.cancha_id}"
        aria-pressed="false"
        ${c.disponible ? "" : html`disabled`}
      >
        ${c.cancha_nombre}
      </button>`,
    ),
  );

  mostrar(el.pasoCancha);
  ocultar(el.pasoCliente);
  ocultar(el.resultado);
}

function seleccionarCancha(canchaId) {
  const cancha = estado.slots.get(estado.hora)?.find((c) => c.cancha_id === canchaId);
  if (!cancha?.disponible) return;
  estado.cancha = cancha;

  $$(".cancha-btn", el.canchaPicker).forEach((b) => {
    const activo = Number(b.dataset.canchaId) === canchaId;
    b.classList.toggle("selected", activo);
    b.setAttribute("aria-pressed", String(activo));
  });

  render(
    el.turnoInfo,
    html`<strong>Turno:</strong> ${formatFecha(estado.fecha)} · ${estado.hora} hs ·
      <strong>${cancha.cancha_nombre}</strong>`,
  );

  el.formCliente.reset();
  estado.cliente = null;
  actualizarClienteEncontrado();
  ocultar(el.msg);
  mostrar(el.pasoCliente);
  el.telefono.focus();
}

// ── Paso 3: cliente ──────────────────────────────────────────────

function actualizarClienteEncontrado() {
  const { cliente } = estado;
  mostrar(el.clienteEncontrado, Boolean(cliente));
  mostrar(el.camposNuevo, !cliente);
  el.nombre.required = el.apellido.required = !cliente;
  if (cliente) {
    el.clienteEncontrado.textContent = `✓ Cliente encontrado: ${cliente.nombre} ${cliente.apellido}`;
  }
}

const pedirCliente = soloUltima((signal, telefono) =>
  api.clientes.buscarPorTelefono(telefono, { signal }),
);

const buscarCliente = debounce(async () => {
  const telefono = el.telefono.value.trim();
  if (telefono.length < MIN_DIGITOS_TELEFONO) {
    estado.cliente = null;
    actualizarClienteEncontrado();
    return;
  }
  try {
    const { cliente } = await pedirCliente(telefono);
    estado.cliente = cliente;
    actualizarClienteEncontrado();
  } catch (error) {
    if (!esCancelacion(error)) notificar("error", error.message);
  }
}, 400);

function validar({ precio, telefono, nombre, apellido }) {
  if (!estado.fecha || !estado.hora) return "Seleccioná fecha y horario.";
  if (!estado.cancha) return "Seleccioná una cancha.";
  if (precio === "" || Number.isNaN(Number(precio)) || Number(precio) < 0)
    return "Ingresá un precio válido para el turno.";
  if (!telefono) return "Ingresá el teléfono del cliente.";
  if (!estado.cliente && (!nombre || !apellido))
    return "Ingresá nombre y apellido del cliente nuevo.";
  return null;
}

async function confirmarTurno(event) {
  event.preventDefault();
  const datos = {
    precio: el.precio.value,
    telefono: el.telefono.value.trim(),
    nombre: el.nombre.value.trim(),
    apellido: el.apellido.value.trim(),
  };

  const error = validar(datos);
  if (error) {
    mostrarAlerta(el.msg, "error", error);
    return;
  }

  const payload = {
    fecha: estado.fecha,
    hora: estado.hora,
    cancha_id: estado.cancha.cancha_id,
    precio: Number(datos.precio),
    telefono: datos.telefono,
    ...(estado.cliente
      ? { cliente_id: estado.cliente.id }
      : { nombre: datos.nombre, apellido: datos.apellido }),
  };

  await conBotonOcupado(el.btnConfirmar, async () => {
    try {
      const { turno } = await api.turnos.crear(payload);
      mostrarConfirmacion(turno);
    } catch (err) {
      mostrarAlerta(el.msg, "error", err.message || "Error al guardar.");
      if (err.status === 409) {
        mostrarSugerencias(estado.fecha, estado.hora);
        cargarHorarios(estado.fecha); // el horario pudo haberse ocupado
      }
    }
  });
}

function mostrarConfirmacion(t) {
  limpiarSeleccion();
  render(
    el.resultado,
    html`<div class="alert alert-success" role="status">✓ Turno confirmado exitosamente</div>
      <div class="card">
        <div class="card-title">Resumen del turno</div>
        <dl class="resumen">
          <dt>Cliente</dt><dd>${t.nombre} ${t.apellido}</dd>
          <dt>Teléfono</dt><dd>${t.telefono}</dd>
          <dt>Cancha</dt><dd>${t.cancha_nombre}</dd>
          <dt>Fecha</dt><dd>${formatFecha(t.fecha, FORMATO_FECHA.largoConAnio)}</dd>
          <dt>Horario</dt><dd>${t.hora} a ${sumarHoras(t.hora)} hs</dd>
          <dt>Precio</dt><dd>${formatPrecio(t.precio)}</dd>
        </dl>
        <div class="acciones">
          <button type="button" class="btn btn-secondary" data-action="nuevo-turno">+ Nuevo turno</button>
        </div>
      </div>`,
  );
  mostrar(el.resultado);
  cargarHorarios(estado.fecha); // refleja el horario recién ocupado
}

async function mostrarSugerencias(fecha, hora) {
  try {
    const { sugerencias } = await api.disponibilidad.sugerencias(fecha, hora);
    if (!sugerencias?.length) return;
    render(
      el.resultado,
      html`<div class="alert alert-warn">
        ⚠ Ese horario está lleno. Horarios con disponibilidad:
        <div class="sugerencias">
          ${sugerencias.map(
            (s) => html`<button type="button" class="sug-chip" data-fecha="${s.fecha}" data-hora="${s.hora}">
              ${formatFecha(s.fecha, FORMATO_FECHA.corto)} ${s.hora}
            </button>`,
          )}
        </div>
      </div>`,
    );
    mostrar(el.resultado);
  } catch {
    // Las sugerencias son opcionales: si fallan, queda el mensaje de error.
  }
}

async function irASugerencia(fecha, hora) {
  el.fecha.value = fecha;
  limpiarSeleccion();
  ocultar(el.resultado);
  if (await cargarHorarios(fecha)) seleccionarHora(hora);
}

// ── Reset ────────────────────────────────────────────────────────

function limpiarSeleccion() {
  estado.hora = null;
  estado.cancha = null;
  estado.cliente = null;
  ocultar(el.pasoCancha);
  ocultar(el.pasoCliente);
  if (estado.slots.size) renderHorarios();
}

function nuevoTurno() {
  el.fecha.value = "";
  estado.fecha = null;
  estado.slots = new Map();
  limpiarSeleccion();
  ocultar(el.horarioWrap);
  ocultar(el.resultado);
  el.fecha.focus();
}

// ── Ciclo de vida ────────────────────────────────────────────────

export function init() {
  el = {
    fecha: byId("inp-fecha"),
    horarioWrap: byId("horario-wrap"),
    grid: byId("horario-grid"),
    pasoCancha: byId("paso-cancha"),
    horaInfo: byId("turno-hora-info"),
    canchaPicker: byId("cancha-picker"),
    pasoCliente: byId("paso-cliente"),
    formCliente: byId("paso-cliente"),
    telefono: byId("inp-tel"),
    clienteEncontrado: byId("cliente-encontrado"),
    camposNuevo: byId("campos-nuevocliente"),
    nombre: byId("inp-nombre"),
    apellido: byId("inp-apellido"),
    precio: byId("inp-precio"),
    turnoInfo: byId("turno-seleccionado-info"),
    msg: byId("msg-reserva"),
    btnConfirmar: byId("btn-confirmar"),
    resultado: byId("resultado-reserva"),
  };

  el.fecha.addEventListener("change", alCambiarFecha);
  delegar(el.grid, "click", ".slot.libre", (_, btn) => seleccionarHora(btn.dataset.hora));
  delegar(el.canchaPicker, "click", ".cancha-btn:not(:disabled)", (_, btn) =>
    seleccionarCancha(Number(btn.dataset.canchaId)),
  );
  el.telefono.addEventListener("input", buscarCliente);
  el.formCliente.addEventListener("submit", confirmarTurno);
  byId("btn-cancelar").addEventListener("click", limpiarSeleccion);
  delegar(el.resultado, "click", "[data-action='nuevo-turno']", nuevoTurno);
  delegar(el.resultado, "click", ".sug-chip", (_, chip) =>
    irASugerencia(chip.dataset.fecha, chip.dataset.hora),
  );
}

export function mount() {
  // Si ya hay una fecha elegida, refrescamos por si cambió algo en otra pestaña.
  if (estado.fecha) cargarHorarios(estado.fecha);
}
