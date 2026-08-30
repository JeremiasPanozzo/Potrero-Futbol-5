from flask import Blueprint

turnos_bp = Blueprint("turnos", __name__, url_prefix="/api/turnos")

from . import routes  # noqa: E402,F401