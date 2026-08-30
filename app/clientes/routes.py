from flask import jsonify, request
from . import clientes_bp
from app.auth.decorators import login_required
from .service import buscar_cliente

@clientes_bp.get("/buscar")
@login_required
def buscar():
    telefono = request.args.get("telefono", "").strip()

    cliente = buscar_cliente(telefono)

    return jsonify({
        "cliente": cliente
    })