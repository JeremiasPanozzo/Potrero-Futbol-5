"""
auth.py — Autenticación simple para un único administrador.

Las credenciales se guardan en la base de datos (tabla 'admin').
Para cambiar la contraseña basta con correr:
    python auth.py
"""

from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from flask import session, redirect, url_for, request
from database import get_db

# ─── Decorador: rutas protegidas ────────────────────────────────
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("autenticado"):
            # Para llamadas API devolver 401, para páginas redirigir
            if request.path.startswith("/api/"):
                from flask import jsonify
                return jsonify({"error": "No autorizado"}), 401
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated

# ─── Inicializar credenciales por defecto ────────────────────────
def init_admin(usuario="admin", password="admin123"):
    """Crea el admin si no existe. Llama esto una sola vez al arrancar."""
    db = get_db()
    db.execute("""
        CREATE TABLE IF NOT EXISTS admin (
            id       INTEGER PRIMARY KEY,
            usuario  TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
        )
    """)
    existente = db.execute("SELECT id FROM admin WHERE usuario = ?", (usuario,)).fetchone()
    if not existente:
        hash_pw = generate_password_hash(password)
        db.execute("INSERT INTO admin (usuario, password) VALUES (?, ?)", (usuario, hash_pw))
        db.commit()
        print(f"Admin creado → usuario: '{usuario}' / contraseña: '{password}'")
        print("⚠  Cambiá la contraseña en producción con: python auth.py")
    db.close()

# ─── Verificar credenciales ──────────────────────────────────────
def verificar_credenciales(usuario, password):
    db = get_db()
    row = db.execute("SELECT password FROM admin WHERE usuario = ?", (usuario,)).fetchone()
    db.close()
    if not row:
        return False
    return check_password_hash(row["password"], password)

# ─── Cambiar contraseña (CLI) ────────────────────────────────────
def cambiar_password(usuario, nueva_password):
    db = get_db()
    hash_pw = generate_password_hash(nueva_password)
    db.execute("UPDATE admin SET password = ? WHERE usuario = ?", (hash_pw, usuario))
    db.commit()
    db.close()
    print(f"Contraseña actualizada para '{usuario}'.")

# ─── CLI para gestión ────────────────────────────────────────────
if __name__ == "__main__":
    import getpass
    print("=== Gestión de credenciales ===")
    usuario = input("Usuario (Enter para 'admin'): ").strip() or "admin"
    nueva = getpass.getpass("Nueva contraseña: ")
    confirma = getpass.getpass("Confirmá la contraseña: ")
    if nueva != confirma:
        print("Las contraseñas no coinciden.")
    elif len(nueva) < 6:
        print("La contraseña debe tener al menos 6 caracteres.")
    else:
        init_admin(usuario, nueva)
        cambiar_password(usuario, nueva)