from flask import jsonify, request
from app.auth.decorators import login_required
from app.errors import ValidationError
from . import disponibilidad_bp
from .service import (obtener_disponibilidad, proximos_disponibles)

@disponibilidad_bp.get("")
@login_required
def disponibilidad():

    fecha = request.args.get("fecha")

    if not fecha:
        raise ValidationError("Falta la fecha")

    resultado = obtener_disponibilidad(fecha)

    return jsonify(resultado)

@disponibilidad_bp.get("/proximos-disponibles")
@login_required
def proximos():
    fecha = request.args.get("fecha")

    hora = request.args.get("hora")

    if not fecha or not hora:
        raise ValidationError("Falta fecha u hora")

    return jsonify({
        "sugerencias": proximos_disponibles(
            fecha,
            hora
        )
    })