from flask import jsonify, request
from app.auth.decorators import login_required
from . import turnos_bp
from .service import (
crear_turno,
eliminar_turno,
listar_turnos,
)

@turnos_bp.post("")
@login_required
def crear():
    data = request.get_json() or {}

    turno = crear_turno(data)

    return jsonify({
        "turno": turno
    }), 201

@turnos_bp.get("")
@login_required
def listar():
    fecha = request.args.get(
        "fecha"
    )

    nombre = request.args.get(
        "nombre",
        ""
    )

    telefono = request.args.get(
        "telefono",
        ""
    )

    cancha_id = request.args.get(
        "cancha_id",
        ""
    )

    turnos = listar_turnos(
        fecha=fecha,
        nombre=nombre,
        telefono=telefono,
        cancha_id=cancha_id or None
    )

    return jsonify({
        "turnos": turnos
    })

@turnos_bp.delete("/<int:turno_id>")
@login_required
def eliminar(turno_id):
    eliminar_turno(turno_id)
    return jsonify({"ok": True})

