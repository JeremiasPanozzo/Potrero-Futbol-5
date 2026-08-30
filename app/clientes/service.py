from app.errors import ValidationError
from . import repository

def buscar_cliente(telefono):
    telefono = (telefono or "").strip()

    if not telefono:
        return None

    return repository.find_by_telefono(telefono)


def obtener_o_crear_cliente(db,cliente_id,nombre,apellido,telefono):

    if cliente_id:
        return cliente_id

    cliente = repository.find_by_telefono(telefono, db=db)

    if cliente:
        return cliente["id"]

    if not nombre or not apellido:
        raise ValidationError(
            "Cliente nuevo requiere "
            "nombre y apellido"
        )

    return repository.create(
        nombre=nombre,
        apellido=apellido,
        telefono=telefono,
        db=db
    )