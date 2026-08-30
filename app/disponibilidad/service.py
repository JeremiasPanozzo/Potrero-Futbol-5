from app.database import get_db
from app.config import Config
from app.canchas.repository import find_active
from app.turnos.repository import (
find_by_fecha,
)

def obtener_disponibilidad(fecha):
    db = get_db()
    try:
        canchas_rows = db.execute(
            """SELECT id, nombre FROM canchas WHERE activa = 1 ORDER BY id"""
        ).fetchall()

        canchas = [ dict(row) for row in canchas_rows ]

    finally:
        db.close()

    turnos = find_by_fecha(fecha)

    ocupados = {(turno["hora"], turno["cancha_id"]) for turno in turnos}

    resultado = []

    for hora in Config.HORARIOS:
        slots_canchas = []
        for cancha in canchas:

            disponible = (
                hora,
                cancha["id"]
            ) not in ocupados

            slots_canchas.append({
                "cancha_id": cancha["id"],
                "cancha_nombre": cancha["nombre"],
                "disponible": disponible,
            })

        alguna_libre = any(
            slot["disponible"]
            for slot in slots_canchas
        )

        resultado.append({
            "hora": hora,
            "disponible": alguna_libre,
            "canchas": slots_canchas,
        })

    return {
        "slots": resultado,
        "canchas": canchas,
    }

def proximos_disponibles(fecha, hora):

    from datetime import datetime, timedelta
    db = get_db()
    try:
        canchas = db.execute("""SELECT id FROM canchas WHERE activa = 1""").fetchall()
        cantidad_canchas = len(canchas)
    finally:
        db.close()

    if cantidad_canchas == 0:
        return []

    fecha_dt = datetime.strptime(
        fecha,
        "%Y-%m-%d"
    )

    sugerencias = []
    for delta in range(0, 7):
        fecha_actual = (
            fecha_dt +
            timedelta(days=delta)
        ).strftime("%Y-%m-%d")

        db = get_db()

        try:
            rows = db.execute("""SELECT hora, COUNT(*) AS cantidad FROM turnos WHERE fecha = ? GROUP BY hora """, (fecha_actual,)).fetchall()
        finally:
            db.close()

        ocupadas = {
            row["hora"]: row["cantidad"]
            for row in rows
        }

        for horario in Config.HORARIOS:
            if (fecha_actual == fecha and horario <= hora):
                continue

            if (ocupadas.get(horario, 0) < cantidad_canchas):
                sugerencias.append({
                    "fecha": fecha_actual,
                    "hora": horario,
                })

            if len(sugerencias) >= 3:
                return sugerencias

    return sugerencias