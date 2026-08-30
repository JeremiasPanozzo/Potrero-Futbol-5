// ── Estado global ─────────────────────────────────────────────────
let horaSeleccionada = null;
let canchaSeleccionada = null;
let slotsCanchas = []; // disponibilidad del slot seleccionado
let clienteExistente = null;
let buscarTimer = null;
let relojInterval = null;
let canchasCache = []; // canchas activas

// ── Navegación ────────────────────────────────────────────────────
function showPage(name, btn) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active", "entrando"));
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  const target = document.getElementById("page-" + name);
  target.classList.add("active");
  void target.offsetWidth;
  target.classList.add("entrando");
  if (btn) btn.classList.add("active");
  if (name === "home") cargarHome();
  if (name === "turnos") {
    cargarCanchas().then(poblarFiltroCancha);
    cargarTurnos();
  }
  if (name === "config") cargarConfig();
}

// ── Canchas ───────────────────────────────────────────────────────
async function cargarCanchas() {
  const r = await fetch("/api/canchas");
  const d = await r.json();
  canchasCache = d.canchas.filter((c) => c.activa);
  return d.canchas;
}

function poblarFiltroCancha() {
  const sel = document.getElementById("filtro-cancha");
  const val = sel.value;
  sel.innerHTML = '<option value="">Todas</option>';
  canchasCache.forEach((c) => {
    const o = document.createElement("option");
    o.value = c.id;
    o.textContent = c.nombre;
    if (String(c.id) === val) o.selected = true;
    sel.appendChild(o);
  });
}

// ── HOME ──────────────────────────────────────────────────────────
function tickReloj() {
  const n = new Date();
  document.getElementById("home-reloj").textContent =
    String(n.getHours()).padStart(2, "0") +
    ":" +
    String(n.getMinutes()).padStart(2, "0");
}
function initFecha() {
  const n = new Date();
  const dia = n.toLocaleDateString("es-AR", { weekday: "long" });
  document.getElementById("home-dia").textContent =
    dia[0].toUpperCase() + dia.slice(1);
  document.getElementById("home-fecha-completa").textContent = n
    .toLocaleDateString("es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();
  tickReloj();
  clearInterval(relojInterval);
  relojInterval = setInterval(tickReloj, 10000);
}

async function cargarHome() {
  initFecha();
  const r = await fetch("/api/home");
  const data = await r.json();
  canchasCache = data.canchas;

  document.getElementById("stat-reservados").textContent =
    data.turnos_hoy.length;
  document.getElementById("stat-libres").textContent = data.libres_hoy;
  document.getElementById("stat-recaudacion").textContent =
    "$" + Number(data.recaudacion_hoy).toLocaleString("es-AR");
  document.getElementById("stat-historico").textContent = data.total_historico;

  const proxEl = document.getElementById("home-proximo");
  if (data.proximo) {
    proxEl.innerHTML = `<div class="proximo-card">
      <div>
        <div class="proximo-label">Próximo turno</div>
        <div class="proximo-hora">${data.proximo.hora} hs</div>
        <div class="proximo-cliente">${data.proximo.nombre} ${data.proximo.apellido}</div>
        <div class="proximo-det">${data.proximo.telefono} · ${data.proximo.cancha_nombre}</div>
      </div>
      <div class="proximo-badge">⚽ En cancha pronto</div>
    </div>`;
  } else {
    proxEl.innerHTML = `<div class="proximo-card"><div class="sin-proximo">No quedan más turnos programados para hoy.</div></div>`;
  }

  renderTimeline(data.canchas, data.turnos_hoy, data.hora_actual);
  renderManana(data.turnos_manana);
}

function renderTimeline(canchas, turnos, horaActual) {
  const HORARIOS = ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];

  // índice {hora_canchaId: turno}
  const idx = {};
  turnos.forEach((t) => {
    idx[`${t.hora}_${t.cancha_id}`] = t;
  });
  const proxHora = turnos.find((t) => t.hora >= horaActual)?.hora;

  let thead =
    "<tr><th>Hora</th>" +
    canchas.map((c) => `<th>${c.nombre}</th>`).join("") +
    "</tr>";
  let tbody = "";

  HORARIOS.forEach((h) => {
    const pasado = h < horaActual;
    const esProx = h === proxHora;
    const clasHora = pasado ? "pasado" : esProx ? "activo" : "";
    let row = `<tr><td class="tl-hora-cell ${clasHora}">${h}</td>`;
    canchas.forEach((c) => {
      const t = idx[`${h}_${c.id}`];
      if (t) {
        row += `<td><div class="tl-slot-ocupado ${pasado ? "pasado" : ""}">
          <div class="tl-slot-nombre">${t.nombre} ${t.apellido}</div>
          <div class="tl-slot-precio">$${Number(t.precio).toLocaleString("es-AR")}</div>
        </div></td>`;
      } else {
        row += `<td><div class="tl-slot-libre">${pasado ? "" : "Libre"}</div></td>`;
      }
    });
    row += "</tr>";
    tbody += row;
  });

  document.getElementById("home-timeline").innerHTML =
    `<thead>${thead}</thead><tbody>${tbody}</tbody>`;
}

function renderManana(turnos) {
  const el = document.getElementById("home-manana");
  if (!turnos.length) {
    el.innerHTML = '<div class="empty-state">Sin turnos para mañana.</div>';
    return;
  }
  let html = '<div class="manana-list">';
  turnos.forEach((t) => {
    html += `<div class="manana-row">
      <div class="manana-hora">${t.hora}</div>
      <div class="manana-cancha">${t.cancha_nombre}</div>
      <div class="manana-nombre">${t.nombre} ${t.apellido}</div>
    </div>`;
  });
  html += "</div>";
  el.innerHTML = html;
}

// ── RESERVAR ──────────────────────────────────────────────────────
async function consultarDisponibilidad() {
  const fecha = document.getElementById("inp-fecha").value;
  if (!fecha) return;
  resetReserva();
  const r = await fetch(`/api/disponibilidad?fecha=${fecha}`);
  const data = await r.json();
  const grid = document.getElementById("horario-grid");
  grid.innerHTML = "";
  data.slots.forEach((slot) => {
    const div = document.createElement("div");
    const libres = slot.canchas.filter((c) => c.disponible).length;
    const total = slot.canchas.length;
    div.className = `slot ${slot.disponible ? "libre" : "ocupado"}`;
    div.innerHTML =
      slot.hora +
      (slot.disponible && total > 1
        ? `<div class="slot-libres-count">${libres}/${total} libres</div>`
        : "");
    if (slot.disponible) {
      div.onclick = () => seleccionarHora(fecha, slot.hora, slot.canchas, div);
    }
    grid.appendChild(div);
  });
  document.getElementById("horario-wrap").classList.remove("hidden");
}

function seleccionarHora(fecha, hora, canchasSlot, el) {
  document
    .querySelectorAll(".slot.seleccionado")
    .forEach((s) => s.classList.remove("seleccionado"));
  el.classList.add("seleccionado");
  horaSeleccionada = hora;
  canchaSeleccionada = null;
  slotsCanchas = canchasSlot;

  const fechaFmt = new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  document.getElementById("turno-hora-info").innerHTML =
    `<strong>${fechaFmt}</strong> a las <strong>${hora} hs</strong> — Elegí la cancha:`;

  // Cancha picker
  const picker = document.getElementById("cancha-picker");
  picker.innerHTML = "";
  canchasSlot.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "cancha-btn" + (c.disponible ? "" : " ocupada");
    btn.textContent = c.cancha_nombre;
    btn.disabled = !c.disponible;
    if (c.disponible)
      btn.onclick = () => seleccionarCancha(c, btn, fecha, hora);
    picker.appendChild(btn);
  });

  document.getElementById("paso-cancha").classList.remove("hidden");
  document.getElementById("paso2").classList.add("hidden");
  document.getElementById("resultado-reserva").classList.add("hidden");
}

function seleccionarCancha(cancha, btn, fecha, hora) {
  document
    .querySelectorAll(".cancha-btn")
    .forEach((b) => b.classList.remove("selected"));
  btn.classList.add("selected");
  canchaSeleccionada = cancha;

  const fechaFmt = new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  document.getElementById("turno-seleccionado-info").innerHTML =
    `<strong>Turno:</strong> ${fechaFmt} · ${hora} hs · <strong>${cancha.cancha_nombre}</strong>`;

  // Reset campos cliente
  document.getElementById("inp-tel").value = "";
  document.getElementById("inp-nombre").value = "";
  document.getElementById("inp-apellido").value = "";
  document.getElementById("inp-precio").value = "";
  document.getElementById("cliente-encontrado").classList.add("hidden");
  document.getElementById("campos-nuevocliente").classList.remove("hidden");
  document.getElementById("msg-reserva").classList.add("hidden");
  clienteExistente = null;
  document.getElementById("paso2").classList.remove("hidden");
}

async function buscarCliente() {
  clearTimeout(buscarTimer);
  buscarTimer = setTimeout(async () => {
    const tel = document.getElementById("inp-tel").value.trim();
    const infoEl = document.getElementById("cliente-encontrado");
    const camposEl = document.getElementById("campos-nuevocliente");
    if (tel.length < 8) {
      infoEl.classList.add("hidden");
      camposEl.classList.remove("hidden");
      clienteExistente = null;
      return;
    }
    const r = await fetch(
      `/api/clientes/buscar?telefono=${encodeURIComponent(tel)}`,
    );
    const d = await r.json();
    if (d.cliente) {
      clienteExistente = d.cliente;
      infoEl.textContent = `✓ Cliente encontrado: ${d.cliente.nombre} ${d.cliente.apellido}`;
      infoEl.classList.remove("hidden");
      camposEl.classList.add("hidden");
    } else {
      clienteExistente = null;
      infoEl.classList.add("hidden");
      camposEl.classList.remove("hidden");
    }
  }, 400);
}

async function confirmarTurno() {
  const fecha = document.getElementById("inp-fecha").value;
  const precio = document.getElementById("inp-precio").value;
  const tel = document.getElementById("inp-tel").value.trim();
  const nombre = document.getElementById("inp-nombre").value.trim();
  const apellido = document.getElementById("inp-apellido").value.trim();
  const msgEl = document.getElementById("msg-reserva");

  if (!fecha || !horaSeleccionada) {
    mostrarMsg(msgEl, "error", "Seleccioná fecha y horario.");
    return;
  }
  if (!canchaSeleccionada) {
    mostrarMsg(msgEl, "error", "Seleccioná una cancha.");
    return;
  }
  if (!precio) {
    mostrarMsg(msgEl, "error", "Ingresá el precio del turno.");
    return;
  }
  if (!tel) {
    mostrarMsg(msgEl, "error", "Ingresá el teléfono del cliente.");
    return;
  }
  if (!clienteExistente && (!nombre || !apellido)) {
    mostrarMsg(msgEl, "error", "Ingresá nombre y apellido del cliente nuevo.");
    return;
  }

  const payload = {
    fecha,
    hora: horaSeleccionada,
    cancha_id: canchaSeleccionada.cancha_id,
    precio: parseFloat(precio),
    telefono: tel,
  };
  if (clienteExistente) payload.cliente_id = clienteExistente.id;
  else {
    payload.nombre = nombre;
    payload.apellido = apellido;
  }

  const r = await fetch("/api/turnos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const d = await r.json();

  if (!r.ok) {
    mostrarMsg(msgEl, "error", d.error || "Error al guardar.");
    if (r.status === 409) buscarSugerencias(fecha, horaSeleccionada);
    return;
  }

  const t = d.turno;
  const fechaFmt = new Date(t.fecha + "T12:00:00").toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const resultEl = document.getElementById("resultado-reserva");
  resultEl.innerHTML = `
    <div class="alert alert-success">✓ Turno confirmado exitosamente</div>
    <div class="card">
      <div class="card-title">Resumen del turno</div>
      <p><strong>Cliente:</strong> ${t.nombre} ${t.apellido}</p>
      <p style="margin-top:.4rem"><strong>Teléfono:</strong> ${t.telefono}</p>
      <p style="margin-top:.4rem"><strong>Cancha:</strong> ${t.cancha_nombre}</p>
      <p style="margin-top:.4rem"><strong>Fecha:</strong> ${fechaFmt}</p>
      <p style="margin-top:.4rem"><strong>Horario:</strong> ${t.hora} a ${addHour(t.hora)} hs</p>
      <p style="margin-top:.4rem"><strong>Precio:</strong> $${Number(t.precio).toLocaleString("es-AR")}</p>
      <div style="margin-top:1rem"><button class="btn btn-secondary" onclick="nuevoTurno()">+ Nuevo turno</button></div>
    </div>`;
  resultEl.classList.remove("hidden");
  document.getElementById("paso-cancha").classList.add("hidden");
  document.getElementById("paso2").classList.add("hidden");
  consultarDisponibilidad();
}

async function buscarSugerencias(fecha, hora) {
  const r = await fetch(
    `/api/disponibilidad/proximos-disponibles?fecha=${fecha}&hora=${hora}`,
  );
  const d = await r.json();
  if (!d.sugerencias?.length) return;
  const chips = d.sugerencias
    .map((s) => {
      const f = new Date(s.fecha + "T12:00:00").toLocaleDateString("es-AR", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      return `<div class="sug-chip" onclick="irSugerencia('${s.fecha}','${s.hora}')">${f} ${s.hora}</div>`;
    })
    .join("");
  const resultEl = document.getElementById("resultado-reserva");
  resultEl.innerHTML = `<div class="alert alert-warn">⚠ Ese horario está lleno. Horarios con disponibilidad:<div class="sugerencias">${chips}</div></div>`;
  resultEl.classList.remove("hidden");
}

function irSugerencia(fecha, hora) {
  document.getElementById("inp-fecha").value = fecha;
  document.getElementById("resultado-reserva").classList.add("hidden");
  consultarDisponibilidad().then(() => {
    document.querySelectorAll(".slot.libre").forEach((s) => {
      if (s.textContent.trim().startsWith(hora)) s.click();
    });
  });
}

function resetReserva() {
  horaSeleccionada = null;
  canchaSeleccionada = null;
  document.getElementById("paso-cancha").classList.add("hidden");
  document.getElementById("paso2").classList.add("hidden");
  document.getElementById("resultado-reserva").classList.add("hidden");
}

function nuevoTurno() {
  document.getElementById("inp-fecha").value = "";
  document.getElementById("horario-wrap").classList.add("hidden");
  resetReserva();
}

function cancelarReserva() {
  horaSeleccionada = null;
  canchaSeleccionada = null;
  document
    .querySelectorAll(".slot.seleccionado")
    .forEach((s) => s.classList.remove("seleccionado"));
  document.getElementById("paso-cancha").classList.add("hidden");
  document.getElementById("paso2").classList.add("hidden");
}

// ── TURNOS ────────────────────────────────────────────────────────
async function cargarTurnos() {
  const fecha = document.getElementById("filtro-fecha").value;
  const nombre = document.getElementById("filtro-nombre").value;
  const tel = document.getElementById("filtro-tel").value;
  const cancha = document.getElementById("filtro-cancha").value;
  const params = new URLSearchParams();
  if (fecha) params.set("fecha", fecha);
  if (nombre) params.set("nombre", nombre);
  if (tel) params.set("telefono", tel);
  if (cancha) params.set("cancha_id", cancha);
  const r = await fetch("/api/turnos?" + params);
  const d = await r.json();
  renderTurnos(d.turnos);
}

function renderTurnos(turnos) {
  const el = document.getElementById("turnos-container");
  if (!turnos.length) {
    el.innerHTML = '<div class="empty-state">Sin turnos encontrados.</div>';
    return;
  }
  let html = `<div class="turno-row header">
    <span>Fecha</span><span>Hora</span><span>Cancha</span><span>Cliente</span><span>Teléfono</span><span>Precio</span><span></span>
  </div><div class="turnos-list">`;
  turnos.forEach((t) => {
    const f = new Date(t.fecha + "T12:00:00").toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
    html += `<div class="turno-row" id="turno-${t.id}">
      <span class="t-fecha">${f}</span>
      <span class="t-hora">${t.hora}</span>
      <span class="t-cancha">${t.cancha_nombre}</span>
      <span class="t-cliente">${t.nombre} ${t.apellido}</span>
      <span class="t-tel">${t.telefono}</span>
      <span class="t-precio">$${Number(t.precio).toLocaleString("es-AR")}</span>
      <span><button class="btn btn-danger btn-sm" onclick="eliminarTurno(${t.id})">Eliminar</button></span>
    </div>`;
  });
  el.innerHTML = html + "</div>";
}

async function eliminarTurno(id) {
  if (!confirm("¿Eliminar este turno?")) return;
  await fetch(`/api/turnos/${id}`, { method: "DELETE" });
  cargarTurnos();
}

function limpiarFiltros() {
  ["filtro-fecha", "filtro-nombre", "filtro-tel"].forEach(
    (id) => (document.getElementById(id).value = ""),
  );
  document.getElementById("filtro-cancha").value = "";
  cargarTurnos();
}

// ── CONFIGURACIÓN ─────────────────────────────────────────────────
async function cargarConfig() {
  const canchas = await cargarCanchas();
  // incluye inactivas en config
  const r2 = await fetch("/api/canchas");
  const d = await r2.json();
  renderConfigCanchas(d.canchas);
}

function renderConfigCanchas(canchas) {
  const el = document.getElementById("config-cancha-list");
  if (!canchas.length) {
    el.innerHTML =
      '<div class="empty-state">No hay canchas configuradas.</div>';
    return;
  }
  el.innerHTML = "";
  canchas.forEach((c) => {
    const item = document.createElement("div");
    item.className = "cancha-item" + (c.activa ? "" : " inactiva");
    item.id = `cancha-item-${c.id}`;
    item.innerHTML = `
      <input class="cancha-nombre-edit" value="${c.nombre}" id="cancha-nombre-${c.id}"
        onblur="renombrarCancha(${c.id})" onkeydown="if(event.key==='Enter')this.blur()">
      <div class="cancha-actions">
        <label class="toggle-activa">
          <input type="checkbox" ${c.activa ? "checked" : ""} onchange="toggleCancha(${c.id}, this.checked)">
          ${c.activa ? "Activa" : "Inactiva"}
        </label>
        <button class="btn btn-danger btn-sm" onclick="borrarCancha(${c.id})">Eliminar</button>
      </div>`;
    el.appendChild(item);
  });
}

async function renombrarCancha(id) {
  const nombre = document.getElementById(`cancha-nombre-${id}`).value.trim();
  if (!nombre) return;
  const r = await fetch(`/api/canchas/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre }),
  });
  const d = await r.json();
  if (!r.ok) mostrarConfigMsg("error", d.error);
}

async function toggleCancha(id, activa) {
  const r = await fetch(`/api/canchas/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activa }),
  });
  const d = await r.json();
  if (!r.ok) {
    mostrarConfigMsg("error", d.error);
    cargarConfig();
  } else {
    const lbl = document.querySelector(`#cancha-item-${id} .toggle-activa`);
    if (lbl) lbl.textContent = activa ? "✓ Activa" : "Inactiva";
    document
      .getElementById(`cancha-item-${id}`)
      ?.classList.toggle("inactiva", !activa);
  }
}

async function borrarCancha(id) {
  if (
    !confirm(
      "¿Eliminar esta cancha? Solo es posible si no tiene turnos registrados.",
    )
  )
    return;
  const r = await fetch(`/api/canchas/${id}`, { method: "DELETE" });
  const d = await r.json();
  if (!r.ok) mostrarConfigMsg("error", d.error);
  else cargarConfig();
}

async function crearCancha() {
  const inp = document.getElementById("inp-nueva-cancha");
  const nombre = inp.value.trim();
  if (!nombre) return;
  const r = await fetch("/api/canchas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre }),
  });
  const d = await r.json();
  if (!r.ok) {
    mostrarConfigMsg("error", d.error);
    return;
  }
  inp.value = "";
  mostrarConfigMsg("success", `"${d.cancha.nombre}" agregada correctamente.`);
  cargarConfig();
}

function mostrarConfigMsg(tipo, txt) {
  const el = document.getElementById("config-msg");
  el.className = `alert alert-${tipo === "error" ? "error" : "success"}`;
  el.textContent = txt;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 4000);
}

// ── Helpers ───────────────────────────────────────────────────────
function mostrarMsg(el, tipo, txt) {
  el.className = `alert alert-${tipo === "error" ? "error" : "success"}`;
  el.textContent = txt;
  el.classList.remove("hidden");
}
function addHour(h) {
  const [hh, mm] = h.split(":").map(Number);
  return String(hh + 1).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
}

// ── Arranque ──────────────────────────────────────────────────────
document.getElementById("page-home").classList.add("entrando");
cargarHome();
