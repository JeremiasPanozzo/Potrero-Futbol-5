from datetime import datetime
from app.database import get_db
from app.errors import (ConflictError, NotFoundError, ValidationError)
from app.canchas import repository as canchas_repository
from app.clientes import service as clientes_service
from . import repository

def _validar_fecha(fecha):
    try:
        datetime.strptime(fecha, "%Y-%m-%d")
    except (TypeError, ValueError):
        raise ValidationError("La fecha debe tener formato YYYY-MM-DD")

def _validar_precio(precio):
    if precio is None or precio == "":
        raise ValidationError("El precio es obligatorio")
    try:
        return float(precio)
    except (TypeError, ValueError):
        raise ValidationError("El precio no es válido")

def _validar_datos(data):
    fecha = data.get("fecha")
    hora = data.get("hora")
    precio = data.get("precio")
    cancha_id = data.get("cancha_id")
    telefono = (
    data.get("telefono") or ""
    ).strip()

    
    if not all([
        fecha,
        hora,
        precio is not None,
        telefono,
        cancha_id
    ]):
        raise ValidationError(
            "Faltan datos obligatorios"
        )

    _validar_fecha(fecha)

    precio = _validar_precio(precio)

    return (
        fecha,
        hora,
        precio,
        cancha_id,
        telefono
    )

def crear_turno(data):
    (fecha, hora, precio, cancha_id, telefono) = _validar_datos(data)
    nombre = (data.get("nombre") or "").strip()
    apellido = (data.get("apellido") or "").strip()
    cliente_id = data.get("cliente_id")

    db = get_db()

    try:
        # 1. Verificar cancha.
        cancha = canchas_repository.find_active_by_id(cancha_id, db=db)
        if not cancha:
            raise ValidationError("Cancha no válida")

        # 2. Verificar disponibilidad.
        if repository.exists(fecha, hora, cancha_id, db=db):
            raise ConflictError(f"La {cancha['nombre']} ya está ocupada en ese horario")

        # 3. Buscar o crear cliente.
        cliente_id = clientes_service.obtener_o_crear_cliente(
            db=db,
            cliente_id=cliente_id,
            nombre=nombre,
            apellido=apellido,
            telefono=telefono
        )

        # 4. Crear turno.        
        turno_id = repository.create(cliente_id, cancha_id, fecha, hora, precio, db=db)

        db.commit()

        # 5. Obtener resultado completo.
        return repository.find_by_id(turno_id, db=db)

    except ConflictError:
        db.rollback()
        raise
    except ValidationError:
        db.rollback()
        raise
    except Exception as error:
        db.rollback()
        if "UNIQUE" in str(error).upper():
            raise ConflictError("El turno ya está ocupado.") from error
        raise
    finally:
        db.close()
        
def listar_turnos(fecha=None, nombre="", telefono="", cancha_id=None):
    return repository.find_by_filters(
    fecha=fecha,
    nombre=nombre,
    telefono=telefono,
    cancha_id=cancha_id
    )

def eliminar_turno(turno_id):
    turno = repository.find_by_id(turno_id)

    if not turno:
        raise NotFoundError(
            "Turno no encontrado"
        )

    repository.delete(turno_id)


def obtener_turnos_del_dia(fecha):
    return repository.find_by_fecha(
        fecha
    )

def obtener_ocupados_por_hora(fecha):
    return repository.count_by_hora(
        fecha
    )

def contar_turnos_historicos():
    return repository.count_all()