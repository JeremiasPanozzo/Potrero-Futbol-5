from flask import Blueprint

clientes_bp = Blueprint("clientes", __name__, url_prefix="/api/clientes")

from . import routes
