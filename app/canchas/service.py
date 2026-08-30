
from datetime import datetime
from app.errors import (ConflictError, NotFoundError, ValidationError,)
from . import repository

def listar_canchas():
    return repository.find_all()

def crear_cancha(data):
    nombre = (
    data.get("nombre") or ""
    ).strip()

    if not nombre:
        raise ValidationError(
            "El nombre es obligatorio"
        )

    try:
        cancha_id = repository.create(nombre)

    except Exception as error:
        if "UNIQUE" in str(error).upper():
            raise ConflictError(
                "Ya existe una cancha con ese nombre"
            ) from error
        raise

    return repository.find_by_id(cancha_id)


def editar_cancha(cancha_id, data):
    cancha = repository.find_by_id(cancha_id)


    if not cancha:
        raise NotFoundError(
            "Cancha no encontrada"
        )

    nombre = (
        data.get("nombre") or ""
    ).strip()

    activa = data.get("activa")

    if nombre:
        try:
            repository.update(
                cancha_id,
                nombre=nombre
            )

        except Exception as error:
            if "UNIQUE" in str(error).upper():
                raise ConflictError(
                    "Ya existe una cancha con ese nombre"
                ) from error
            raise

    if activa is not None:
        if not activa:
            hoy = datetime.now().strftime("%Y-%m-%d")
            futuros = repository.count_future_turnos(cancha_id, hoy)
            if futuros > 0:
                raise ConflictError(
                    f"La cancha tiene {futuros} turno(s) futuro(s). "
                    "Eliminá los turnos antes de desactivarla."
                )
        repository.update(cancha_id, activa=activa) 

        repository.update(
            cancha_id,
            activa=activa
        )

    return repository.find_by_id(cancha_id)


def eliminar_cancha(cancha_id):
    cancha = repository.find_by_id(cancha_id)

    if not cancha:
        raise NotFoundError(
            "Cancha no encontrada"
        )

    total_activas = repository.count_active()

    if total_activas <= 1:
        raise ConflictError(
            "Debe quedar al menos una cancha activa"
        )

    turnos = repository.count_turnos(
        cancha_id
    )

    if turnos > 0:
        raise ConflictError(
            f"La cancha tiene {turnos} "
            "turno(s) registrado(s). "
            "Eliminá los turnos primero."
        )

    repository.delete(cancha_id)