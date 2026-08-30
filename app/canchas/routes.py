from flask import jsonify, request
from app.auth.decorators import login_required
from . import canchas_bp
from . import service

@canchas_bp.route("", methods=["GET"])
@login_required
def listar_canchas():
    return jsonify({"canchas": service.listar_canchas()})

@canchas_bp.route("", methods=["POST"])
@login_required
def crear_cancha():
    cancha = service.crear_cancha(request.get_json())
    return jsonify({"cancha": cancha}), 201

@canchas_bp.route("/<int:cancha_id>", methods=["PATCH"])
@login_required
def editar_cancha(cancha_id):
    cancha = service.editar_cancha(cancha_id, request.get_json())
    return jsonify({"cancha": cancha})

@canchas_bp.route("/<int:cancha_id>", methods=["DELETE"])
@login_required
def eliminar_cancha(cancha_id):
    service.eliminar_cancha(cancha_id)
    return jsonify({"ok": True})