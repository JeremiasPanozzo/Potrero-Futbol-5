from flask import Blueprint

canchas_bp = Blueprint("canchas", __name__ , url_prefix="/api/canchas")

from . import routes  # noqa: E402,F401