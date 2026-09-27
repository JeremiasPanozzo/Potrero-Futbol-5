// Punto de entrada: navegación entre pestañas y arranque de cada página.
import * as home from "./pages/home.js";
import * as reservar from "./pages/reservar.js";
import * as turnos from "./pages/turnos.js";
import * as config from "./pages/config.js";
import { $$, byId } from "./utils/dom.js";

const PAGINAS = { home, reservar, turnos, config };
const INICIAL = "home";
let actual = null;

function mostrarPagina(nombre) {
  if (!PAGINAS[nombre]) nombre = INICIAL;
  if (actual && actual !== nombre) PAGINAS[actual].unmount?.();
  actual = nombre;

  $$(".page").forEach((p) => p.classList.remove("active", "entrando"));
  const pagina = byId(`page-${nombre}`);
  pagina.classList.add("active");
  void pagina.offsetWidth; // reinicia la animación de entrada
  pagina.classList.add("entrando");

  $$(".tab").forEach((tab) => {
    const activa = tab.dataset.page === nombre;
    tab.classList.toggle("active", activa);
    tab.setAttribute("aria-current", activa ? "page" : "false");
  });

  PAGINAS[nombre].mount();
}

const paginaDelHash = () => location.hash.slice(1) || INICIAL;

Object.values(PAGINAS).forEach((p) => p.init?.());

// La pestaña queda en la URL (#turnos), así recargar no te devuelve al inicio.
$$(".tab").forEach((tab) =>
  tab.addEventListener("click", () => {
    const nombre = tab.dataset.page;
    if (paginaDelHash() === nombre) mostrarPagina(nombre); // re-click: refresca
    else location.hash = nombre;
  }),
);
window.addEventListener("hashchange", () => mostrarPagina(paginaDelHash()));

mostrarPagina(paginaDelHash());
