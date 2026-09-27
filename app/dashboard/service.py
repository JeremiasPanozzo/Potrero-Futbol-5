from datetime import datetime, timedelta
from app.config import Config
from app.database import get_db
from app.canchas import repository as canchas_repository   # ← esta línea
from app.turnos.service import (
contar_turnos_historicos,
obtener_turnos_del_dia,
)


def obtener_dashboard():

    ahora = datetime.now()
    hoy = ahora.strftime("%Y-%m-%d")
    manana = (ahora + timedelta(days=1)).strftime("%Y-%m-%d")
    hora_actual = ahora.strftime("%H:%M")
    canchas = canchas_repository.find_active()
    turnos_hoy = obtener_turnos_del_dia(hoy)
    turnos_manana = obtener_turnos_del_dia(manana)
    cantidad_canchas = len(canchas)
    total_slots = len(Config.HORARIOS) * cantidad_canchas
    ocupados_hoy = len(turnos_hoy)
    libres_hoy = total_slots - ocupados_hoy
    recaudacion = sum(turno["precio"] for turno in turnos_hoy)

    proximo = next(
        (
            turno
            for turno in turnos_hoy
            if turno["hora"] >= hora_actual
        ),
        None
    )

    total_historico = contar_turnos_historicos()

    return {
        "hoy": hoy,
        "canchas": canchas,
        "turnos_hoy": turnos_hoy,
        "turnos_manana": turnos_manana,
        "libres_hoy": libres_hoy,
        "recaudacion_hoy": recaudacion,
        "proximo": proximo,
        "hora_actual": hora_actual,
        "horarios": Config.HORARIOS,
        "total_slots": total_slots,
        "total_historico": total_historico,
    }