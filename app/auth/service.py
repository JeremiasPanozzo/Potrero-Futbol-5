import os
from functools import wraps
from flask import redirect, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

def _get_admin_user():
    return os.getenv(
    "ADMIN_USER",
    "admin"
)

def _get_admin_password():
    return os.getenv(
    "ADMIN_PASSWORD",
    "admin"
)

def init_admin():
    """
    Inicializa/verifica las credenciales del administrador.
    En esta versión las credenciales vienen de .env.
    """
    return None

def verificar_credenciales(usuario, password):
    if usuario != _get_admin_user():
        return False

    stored_password = _get_admin_password()

    # Permite tanto password plano para desarrollo
    # como un hash generado con werkzeug.
    if stored_password.startswith(("scrypt:", "pbkdf2:")):
        return check_password_hash(
            stored_password,
            password
        )

    return password == stored_password
