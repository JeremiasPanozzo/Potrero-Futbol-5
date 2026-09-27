// Cliente HTTP único para toda la app.
// Centraliza headers, parseo de JSON, errores y sesión vencida.

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** true si el error viene de una petición cancelada (AbortController). */
export const esCancelacion = (error) => error?.name === "AbortError";

async function request(url, { method = "GET", body, signal } = {}) {
  const opciones = { method, signal, headers: { Accept: "application/json" } };
  if (body !== undefined) {
    opciones.headers["Content-Type"] = "application/json";
    opciones.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, opciones);
  } catch (error) {
    if (esCancelacion(error)) throw error;
    throw new ApiError("No se pudo conectar con el servidor.");
  }

  const esJson = res.headers.get("content-type")?.includes("application/json");

  // @login_required redirige al login (HTML) cuando la sesión venció.
  if (!esJson && res.redirected) {
    window.location.assign("/login");
    throw new ApiError("La sesión venció. Volvé a ingresar.", 401);
  }

  const data = esJson ? await res.json() : null;
  if (!res.ok) {
    throw new ApiError(data?.error || "Ocurrió un error inesperado.", res.status);
  }
  return data;
}

const conQuery = (path, params) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  ).toString();
  return qs ? `${path}?${qs}` : path;
};

export const api = {
  home: () => request("/api/home"),

  canchas: {
    listar: () => request("/api/canchas"),
    crear: (nombre) => request("/api/canchas", { method: "POST", body: { nombre } }),
    actualizar: (id, cambios) =>
      request(`/api/canchas/${id}`, { method: "PATCH", body: cambios }),
    eliminar: (id) => request(`/api/canchas/${id}`, { method: "DELETE" }),
  },

  disponibilidad: {
    porFecha: (fecha, { signal } = {}) =>
      request(conQuery("/api/disponibilidad", { fecha }), { signal }),
    sugerencias: (fecha, hora) =>
      request(conQuery("/api/disponibilidad/proximos-disponibles", { fecha, hora })),
  },

  clientes: {
    buscarPorTelefono: (telefono, { signal } = {}) =>
      request(conQuery("/api/clientes/buscar", { telefono }), { signal }),
  },

  turnos: {
    listar: (filtros, { signal } = {}) =>
      request(conQuery("/api/turnos", filtros), { signal }),
    crear: (payload) => request("/api/turnos", { method: "POST", body: payload }),
    eliminar: (id) => request(`/api/turnos/${id}`, { method: "DELETE" }),
  },
};

/**
 * Envuelve una función async para que solo cuente la última llamada:
 * cada llamada nueva cancela la anterior (evita que una respuesta vieja
 * pise a una nueva). La función recibe un AbortSignal como primer argumento.
 */
export function soloUltima(fn) {
  let controller = null;
  return (...args) => {
    controller?.abort();
    controller = new AbortController();
    return fn(controller.signal, ...args);
  };
}
