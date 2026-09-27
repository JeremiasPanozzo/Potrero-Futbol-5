import { api } from "../api.js";
import { byId, conBotonOcupado, delegar, html, mostrarAlerta, render } from "../utils/dom.js";

let el = {};

const avisar = (tipo, texto) => mostrarAlerta(el.msg, tipo, texto, { ocultarEn: 4000 });

async function cargarCanchas() {
  try {
    const { canchas } = await api.canchas.listar();
    renderCanchas(canchas);
  } catch (error) {
    avisar("error", error.message);
  }
}

function renderCanchas(canchas) {
  if (!canchas.length) {
    render(el.lista, html`<div class="empty-state">No hay canchas configuradas.</div>`);
    return;
  }
  render(
    el.lista,
    canchas.map(
      (c) => html`<li class="cancha-item ${c.activa ? "" : "inactiva"}" data-id="${c.id}">
        <input
          class="cancha-nombre-edit"
          value="${c.nombre}"
          data-original="${c.nombre}"
          aria-label="Nombre de la cancha"
          maxlength="60"
        />
        <div class="cancha-actions">
          <label class="toggle-activa">
            <input type="checkbox" ${c.activa ? html`checked` : ""} />
            <span class="toggle-texto">${c.activa ? "Activa" : "Inactiva"}</span>
          </label>
          <button type="button" class="btn btn-danger btn-sm" data-action="eliminar">Eliminar</button>
        </div>
      </li>`,
    ),
  );
}

const idDe = (nodo) => Number(nodo.closest(".cancha-item").dataset.id);

async function renombrar(input) {
  const nombre = input.value.trim();
  const original = input.dataset.original;
  if (!nombre || nombre === original) {
    input.value = original; // no se permiten nombres vacíos
    return;
  }
  try {
    await api.canchas.actualizar(idDe(input), { nombre });
    input.dataset.original = nombre;
    avisar("success", `Cancha renombrada a "${nombre}".`);
  } catch (error) {
    input.value = original;
    avisar("error", error.message);
  }
}

async function cambiarActiva(checkbox) {
  const item = checkbox.closest(".cancha-item");
  const activa = checkbox.checked;
  checkbox.disabled = true;
  try {
    await api.canchas.actualizar(idDe(checkbox), { activa });
    item.classList.toggle("inactiva", !activa);
    item.querySelector(".toggle-texto").textContent = activa ? "Activa" : "Inactiva";
  } catch (error) {
    checkbox.checked = !activa;
    avisar("error", error.message);
  } finally {
    checkbox.disabled = false;
  }
}

async function eliminar(boton) {
  if (!confirm("¿Eliminar esta cancha? Solo es posible si no tiene turnos registrados.")) return;
  await conBotonOcupado(boton, async () => {
    try {
      await api.canchas.eliminar(idDe(boton));
      avisar("success", "Cancha eliminada.");
      await cargarCanchas();
    } catch (error) {
      avisar("error", error.message);
    }
  });
}

async function crear(event) {
  event.preventDefault();
  const nombre = el.inputNueva.value.trim();
  if (!nombre) {
    el.inputNueva.focus();
    return;
  }
  await conBotonOcupado(el.btnAgregar, async () => {
    try {
      const { cancha } = await api.canchas.crear(nombre);
      el.formNueva.reset();
      avisar("success", `"${cancha.nombre}" agregada correctamente.`);
      await cargarCanchas();
    } catch (error) {
      avisar("error", error.message);
    }
  });
}

export function init() {
  el = {
    lista: byId("config-cancha-list"),
    msg: byId("config-msg"),
    formNueva: byId("form-nueva-cancha"),
    inputNueva: byId("inp-nueva-cancha"),
    btnAgregar: byId("btn-agregar-cancha"),
  };

  delegar(el.lista, "focusout", ".cancha-nombre-edit", (_, input) => renombrar(input));
  delegar(el.lista, "keydown", ".cancha-nombre-edit", (event, input) => {
    if (event.key === "Enter") input.blur();
    if (event.key === "Escape") {
      input.value = input.dataset.original;
      input.blur();
    }
  });
  delegar(el.lista, "change", ".toggle-activa input", (_, checkbox) => cambiarActiva(checkbox));
  delegar(el.lista, "click", "[data-action='eliminar']", (_, boton) => eliminar(boton));
  el.formNueva.addEventListener("submit", crear);
}

export function mount() {
  return cargarCanchas();
}
