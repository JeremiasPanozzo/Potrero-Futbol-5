from flask import Blueprint

disponibilidad_bp = Blueprint("disponibilidad", __name__, url_prefix="/api/disponibilidad")

from . import routes  # noqa: E402,F401