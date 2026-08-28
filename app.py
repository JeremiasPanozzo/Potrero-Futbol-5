from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from database import get_db, init_db
from auth import init_admin, verificar_credenciales, login_required
from datetime import datetime, timedelta
import os
import webbrowser, threading
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

app.secret_key = os.environ.get("SECRET_KEY", "potrero-local-key-2026")

HORARIOS = ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00"]

# ─── Login / Logout ──────────────────────────────────────────────
@app.route("/login", methods=["GET", "POST"])
def login():
    if session.get("autenticado"):
        return redirect(url_for("index"))
    error = None
    if request.method == "POST":
        usuario  = request.form.get("usuario", "").strip()
        password = request.form.get("password", "")
        if verificar_credenciales(usuario, password):
            session["autenticado"] = True
            session["usuario"] = usuario
            return redirect(url_for("index"))
        error = "Usuario o contraseña incorrectos."
    return render_template("login.html", error=error)

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

@app.route("/")
@login_required
def index():
    return render_template("index.html", usuario=session.get("usuario"))

# ═══════════════════════════════════════════════════════════════════
# CANCHAS
# ═══════════════════════════════════════════════════════════════════

@app.route("/api/canchas", methods=["GET"])
@login_required
def listar_canchas():
    db = get_db()
    canchas = [dict(r) for r in db.execute(
        "SELECT * FROM canchas ORDER BY id"
    ).fetchall()]
    db.close()
    return jsonify({"canchas": canchas})

@app.route("/api/canchas", methods=["POST"])
@login_required
def crear_cancha():
    data   = request.get_json()
    nombre = (data.get("nombre") or "").strip()
    if not nombre:
        return jsonify({"error": "El nombre es obligatorio"}), 400
    db = get_db()
    try:
        cur = db.execute("INSERT INTO canchas (nombre) VALUES (?)", (nombre,))
        db.commit()
        cancha = dict(db.execute("SELECT * FROM canchas WHERE id = ?", (cur.lastrowid,)).fetchone())
        db.close()
        return jsonify({"cancha": cancha}), 201
    except Exception:
        db.close()
        return jsonify({"error": "Ya existe una cancha con ese nombre"}), 409

@app.route("/api/canchas/<int:cancha_id>", methods=["PATCH"])
@login_required
def editar_cancha(cancha_id):
    data   = request.get_json()
    nombre = (data.get("nombre") or "").strip()
    activa = data.get("activa")
    db = get_db()
    if nombre:
        try:
            db.execute("UPDATE canchas SET nombre = ? WHERE id = ?", (nombre, cancha_id))
        except Exception:
            db.close()
            return jsonify({"error": "Ya existe una cancha con ese nombre"}), 409
    if activa is not None:
        # No permitir desactivar si tiene turnos futuros
        if not activa:
            hoy = datetime.now().strftime("%Y-%m-%d")
            futuros = db.execute(
                "SELECT COUNT(*) FROM turnos WHERE cancha_id = ? AND fecha >= ?",
                (cancha_id, hoy)
            ).fetchone()[0]
            if futuros > 0:
                db.close()
                return jsonify({"error": f"La cancha tiene {futuros} turno(s) futuro(s). Eliminá los turnos antes de desactivarla."}), 409
        db.execute("UPDATE canchas SET activa = ? WHERE id = ?", (int(activa), cancha_id))
    db.commit()
    cancha = dict(db.execute("SELECT * FROM canchas WHERE id = ?", (cancha_id,)).fetchone())
    db.close()
    return jsonify({"cancha": cancha})

@app.route("/api/canchas/<int:cancha_id>", methods=["DELETE"])
@login_required
def eliminar_cancha(cancha_id):
    db = get_db()
    total = db.execute("SELECT COUNT(*) FROM canchas WHERE activa = 1").fetchone()[0]
    if total <= 1:
        db.close()
        return jsonify({"error": "Debe quedar al menos una cancha activa"}), 409
    turnos = db.execute("SELECT COUNT(*) FROM turnos WHERE cancha_id = ?", (cancha_id,)).fetchone()[0]
    if turnos > 0:
        db.close()
        return jsonify({"error": f"La cancha tiene {turnos} turno(s) registrado(s). Eliminá los turnos primero."}), 409
    db.execute("DELETE FROM canchas WHERE id = ?", (cancha_id,))
    db.commit()
    db.close()
    return jsonify({"ok": True})

# ═══════════════════════════════════════════════════════════════════
# DISPONIBILIDAD
# ═══════════════════════════════════════════════════════════════════

@app.route("/api/disponibilidad")
@login_required
def disponibilidad():
    """
    Devuelve para cada horario: si hay al menos una cancha libre,
    y qué canchas están libres/ocupadas.
    """
    fecha = request.args.get("fecha")
    if not fecha:
        return jsonify({"error": "Falta la fecha"}), 400

    db = get_db()
    canchas = [dict(r) for r in db.execute(
        "SELECT id, nombre FROM canchas WHERE activa = 1 ORDER BY id"
    ).fetchall()]

    # turnos del día: {(hora, cancha_id)}
    ocupados = db.execute(
        "SELECT hora, cancha_id FROM turnos WHERE fecha = ?", (fecha,)
    ).fetchall()
    db.close()

    ocupados_set = {(r["hora"], r["cancha_id"]) for r in ocupados}

    resultado = []
    for h in HORARIOS:
        slots_cancha = []
        for c in canchas:
            slots_cancha.append({
                "cancha_id":   c["id"],
                "cancha_nombre": c["nombre"],
                "disponible":  (h, c["id"]) not in ocupados_set
            })
        alguna_libre = any(s["disponible"] for s in slots_cancha)
        resultado.append({
            "hora":       h,
            "disponible": alguna_libre,
            "canchas":    slots_cancha
        })

    return jsonify({"slots": resultado, "canchas": canchas})

# ═══════════════════════════════════════════════════════════════════
# CLIENTES
# ═══════════════════════════════════════════════════════════════════

@app.route("/api/clientes/buscar")
@login_required
def buscar_cliente():
    tel = request.args.get("telefono", "").strip()
    if not tel:
        return jsonify({"cliente": None})
    db = get_db()
    cliente = db.execute(
        "SELECT * FROM clientes WHERE telefono = ?", (tel,)
    ).fetchone()
    db.close()
    return jsonify({"cliente": dict(cliente) if cliente else None})

# ═══════════════════════════════════════════════════════════════════
# TURNOS
# ═══════════════════════════════════════════════════════════════════

@app.route("/api/turnos", methods=["POST"])
@login_required
def crear_turno():
    data      = request.get_json()
    fecha     = data.get("fecha")
    hora      = data.get("hora")
    precio    = data.get("precio")
    cancha_id = data.get("cancha_id")
    nombre    = (data.get("nombre") or "").strip()
    apellido  = (data.get("apellido") or "").strip()
    telefono  = (data.get("telefono") or "").strip()
    cliente_id = data.get("cliente_id")

    if not all([fecha, hora, precio, telefono, cancha_id]):
        return jsonify({"error": "Faltan datos obligatorios"}), 400

    db = get_db()

    # Verificar que la cancha existe y está activa
    cancha = db.execute(
        "SELECT * FROM canchas WHERE id = ? AND activa = 1", (cancha_id,)
    ).fetchone()
    if not cancha:
        db.close()
        return jsonify({"error": "Cancha no válida"}), 400

    # Verificar disponibilidad en esa cancha
    existente = db.execute(
        "SELECT id FROM turnos WHERE fecha = ? AND hora = ? AND cancha_id = ?",
        (fecha, hora, cancha_id)
    ).fetchone()
    if existente:
        db.close()
        return jsonify({"error": f"La {cancha['nombre']} ya está ocupada en ese horario"}), 409

    # Buscar o crear cliente
    if not cliente_id:
        cliente = db.execute(
            "SELECT id FROM clientes WHERE telefono = ?", (telefono,)
        ).fetchone()
        if cliente:
            cliente_id = cliente["id"]
        else:
            if not nombre or not apellido:
                db.close()
                return jsonify({"error": "Cliente nuevo requiere nombre y apellido"}), 400
            cur = db.execute(
                "INSERT INTO clientes (nombre, apellido, telefono) VALUES (?, ?, ?)",
                (nombre, apellido, telefono)
            )
            cliente_id = cur.lastrowid

    cur = db.execute(
        "INSERT INTO turnos (cliente_id, cancha_id, fecha, hora, precio) VALUES (?, ?, ?, ?, ?)",
        (cliente_id, cancha_id, fecha, hora, float(precio))
    )
    turno_id = cur.lastrowid
    db.commit()

    turno = db.execute("""
        SELECT t.*, c.nombre, c.apellido, c.telefono,
               ca.nombre as cancha_nombre
        FROM turnos t
        JOIN clientes c  ON t.cliente_id = c.id
        JOIN canchas  ca ON t.cancha_id  = ca.id
        WHERE t.id = ?
    """, (turno_id,)).fetchone()
    db.close()
    return jsonify({"turno": dict(turno)}), 201

@app.route("/api/turnos")
@login_required
def listar_turnos():
    fecha    = request.args.get("fecha")
    nombre   = request.args.get("nombre", "")
    tel      = request.args.get("telefono", "")
    cancha   = request.args.get("cancha_id", "")
    db = get_db()
    query = """
        SELECT t.id, t.fecha, t.hora, t.precio, t.creado_en,
               c.id as cliente_id, c.nombre, c.apellido, c.telefono,
               ca.id as cancha_id, ca.nombre as cancha_nombre
        FROM turnos t
        JOIN clientes c  ON t.cliente_id = c.id
        JOIN canchas  ca ON t.cancha_id  = ca.id
        WHERE 1=1
    """
    params = []
    if fecha:
        query += " AND t.fecha = ?"
        params.append(fecha)
    if nombre:
        query += " AND (c.nombre LIKE ? OR c.apellido LIKE ?)"
        params += [f"%{nombre}%", f"%{nombre}%"]
    if tel:
        query += " AND c.telefono LIKE ?"
        params.append(f"%{tel}%")
    if cancha:
        query += " AND t.cancha_id = ?"
        params.append(cancha)
    query += " ORDER BY t.fecha, t.hora, ca.id"
    turnos = db.execute(query, params).fetchall()
    db.close()
    return jsonify({"turnos": [dict(t) for t in turnos]})

@app.route("/api/turnos/<int:turno_id>", methods=["DELETE"])
@login_required
def eliminar_turno(turno_id):
    db = get_db()
    db.execute("DELETE FROM turnos WHERE id = ?", (turno_id,))
    db.commit()
    db.close()
    return jsonify({"ok": True})

# ═══════════════════════════════════════════════════════════════════
# SUGERENCIAS
# ═══════════════════════════════════════════════════════════════════

@app.route("/api/proximos-disponibles")
@login_required
def proximos_disponibles():
    fecha = request.args.get("fecha")
    hora  = request.args.get("hora")
    if not fecha or not hora:
        return jsonify({"error": "Falta fecha u hora"}), 400

    db = get_db()
    canchas = db.execute("SELECT id FROM canchas WHERE activa = 1").fetchall()
    n_canchas = len(canchas)

    sugerencias = []
    fecha_dt = datetime.strptime(fecha, "%Y-%m-%d")

    for delta in range(0, 7):
        f = (fecha_dt + timedelta(days=delta)).strftime("%Y-%m-%d")
        ocupadas_count = {}
        for r in db.execute("SELECT hora, COUNT(*) as c FROM turnos WHERE fecha = ? GROUP BY hora", (f,)).fetchall():
            ocupadas_count[r["hora"]] = r["c"]

        for h in HORARIOS:
            if f == fecha and h <= hora:
                continue
            # Hay al menos una cancha libre si el count de ocupadas < total canchas
            if ocupadas_count.get(h, 0) < n_canchas:
                sugerencias.append({"fecha": f, "hora": h})
            if len(sugerencias) >= 3:
                break
        if len(sugerencias) >= 3:
            break

    db.close()
    return jsonify({"sugerencias": sugerencias})

# ═══════════════════════════════════════════════════════════════════
# HOME / DASHBOARD
# ═══════════════════════════════════════════════════════════════════

@app.route("/api/home")
@login_required
def home():
    hoy    = datetime.now().strftime("%Y-%m-%d")
    manana = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    hora_actual = datetime.now().strftime("%H:%M")
    db = get_db()

    canchas = [dict(r) for r in db.execute(
        "SELECT * FROM canchas WHERE activa = 1 ORDER BY id"
    ).fetchall()]

    def turnos_del_dia(fecha):
        return [dict(r) for r in db.execute("""
            SELECT t.id, t.hora, t.precio, t.cancha_id,
                   c.nombre, c.apellido, c.telefono,
                   ca.nombre as cancha_nombre
            FROM turnos t
            JOIN clientes c  ON t.cliente_id = c.id
            JOIN canchas  ca ON t.cancha_id  = ca.id
            WHERE t.fecha = ?
            ORDER BY t.hora, ca.id
        """, (fecha,)).fetchall()]

    turnos_hoy    = turnos_del_dia(hoy)
    turnos_manana = turnos_del_dia(manana)

    n_canchas    = len(canchas)
    total_slots  = len(HORARIOS) * n_canchas
    ocupados_hoy = len(turnos_hoy)
    libres_hoy   = total_slots - ocupados_hoy
    recaudacion  = sum(t["precio"] for t in turnos_hoy)

    proximo = next((t for t in turnos_hoy if t["hora"] >= hora_actual), None)
    total_historico = db.execute("SELECT COUNT(*) as c FROM turnos").fetchone()["c"]

    db.close()
    return jsonify({
        "hoy":             hoy,
        "canchas":         canchas,
        "turnos_hoy":      turnos_hoy,
        "turnos_manana":   turnos_manana,
        "libres_hoy":      libres_hoy,
        "recaudacion_hoy": recaudacion,
        "proximo":         proximo,
        "hora_actual":     hora_actual,
        "total_slots":     total_slots,
        "total_historico": total_historico,
    })

def abrir_navegador():
    webbrowser.open("http://localhost:8000")

if __name__ == "__main__":
    init_db()
    init_admin()
    threading.Timer(1.5, abrir_navegador).start()
    app.run(debug=False, port=8000)