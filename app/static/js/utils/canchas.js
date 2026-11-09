// Color fijo por cancha. Se deriva del id, así cada cancha conserva su
// color aunque se agreguen o eliminen otras. Los colores están en
// base.css (--cancha-0 … --cancha-5).

const CANTIDAD_COLORES = 6;

/** Clase CSS que define --cancha con el color de esa cancha. */
export const claseCancha = (id) => `cancha-c${(Number(id) - 1) % CANTIDAD_COLORES}`;
