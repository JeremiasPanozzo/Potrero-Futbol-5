// Helpers de DOM y render seguro de HTML.

export const byId = (id) => document.getElementById(id);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export const mostrar = (el, visible = true) => el.classList.toggle("hidden", !visible);
export const ocultar = (el) => mostrar(el, false);

// ── HTML seguro ──────────────────────────────────────────────────
// Todo lo interpolado en html`` se escapa, salvo otro html`` (anidado)
// o arrays de ellos. Así los datos de clientes/canchas nunca se
// interpretan como HTML.

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (valor) => String(valor).replace(/[&<>"']/g, (c) => ESCAPES[c]);

class SafeHtml {
  constructor(valor) {
    this.valor = valor;
  }
  toString() {
    return this.valor;
  }
}

function aTexto(valor) {
  if (valor instanceof SafeHtml) return valor.valor;
  if (Array.isArray(valor)) return valor.map(aTexto).join("");
  if (valor === null || valor === undefined || valor === false) return "";
  return escapeHtml(valor);
}

export function html(strings, ...valores) {
  let out = strings[0];
  valores.forEach((valor, i) => {
    out += aTexto(valor) + strings[i + 1];
  });
  return new SafeHtml(out);
}

export function render(el, contenido) {
  el.innerHTML = aTexto(contenido);
}

// ── Eventos ──────────────────────────────────────────────────────

/** Delegación de eventos: un listener en `root` para todos los `selector`. */
export function delegar(root, tipo, selector, handler) {
  root.addEventListener(tipo, (event) => {
    const target = event.target.closest(selector);
    if (target && root.contains(target)) handler(event, target);
  });
}

// ── Mensajes ─────────────────────────────────────────────────────

const timers = new WeakMap();

/** Muestra un mensaje en un contenedor `.alert`. tipo: error | success | info | warn */
export function mostrarAlerta(el, tipo, texto, { ocultarEn } = {}) {
  el.className = `alert alert-${tipo}`;
  el.setAttribute("role", tipo === "error" ? "alert" : "status");
  el.textContent = texto;
  clearTimeout(timers.get(el));
  if (ocultarEn) timers.set(el, setTimeout(() => ocultar(el), ocultarEn));
}

/** Aviso flotante global (errores de carga, confirmaciones rápidas). */
export function notificar(tipo, texto) {
  mostrarAlerta(byId("toast"), tipo, texto, { ocultarEn: 4000 });
}

/** Deshabilita el botón mientras corre `fn`, para evitar doble envío. */
export async function conBotonOcupado(boton, fn) {
  if (boton.disabled) return;
  boton.disabled = true;
  boton.setAttribute("aria-busy", "true");
  try {
    return await fn();
  } finally {
    boton.disabled = false;
    boton.removeAttribute("aria-busy");
  }
}
