// Formateo de fechas, horas y montos (locale es-AR).

const LOCALE = "es-AR";

export const FORMATO_FECHA = {
  largo: { weekday: "long", day: "numeric", month: "long" },
  largoConAnio: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  corto: { weekday: "short", day: "numeric", month: "short" },
  tabla: { day: "2-digit", month: "2-digit", year: "2-digit" },
  completa: { day: "numeric", month: "long", year: "numeric" },
};

// Mediodía para que ningún huso horario corra la fecha un día.
const parseFecha = (iso) => new Date(`${iso}T12:00:00`);

export const formatFecha = (iso, formato = FORMATO_FECHA.largo) =>
  parseFecha(iso).toLocaleDateString(LOCALE, formato);

export const formatPrecio = (monto) => `$${Number(monto).toLocaleString(LOCALE)}`;

const dosDigitos = (n) => String(n).padStart(2, "0");

export const formatHora = (date = new Date()) =>
  `${dosDigitos(date.getHours())}:${dosDigitos(date.getMinutes())}`;

export function sumarHoras(hora, horas = 1) {
  const [hh, mm] = hora.split(":").map(Number);
  return `${dosDigitos((hh + horas) % 24)}:${dosDigitos(mm)}`;
}

export const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
