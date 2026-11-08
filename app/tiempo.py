"""Fecha y hora oficial de la app: siempre en horario de Buenos Aires.

Se usa en lugar de datetime.now() para no depender del reloj ni de la
zona horaria configurada en la PC donde corre el sistema.
"""

from datetime import datetime, timedelta, timezone

try:
    from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

    try:
        ZONA_HORARIA = ZoneInfo("America/Argentina/Buenos_Aires")
    except ZoneInfoNotFoundError:
        # En Windows sin el paquete "tzdata" no hay base de zonas horarias.
        ZONA_HORARIA = None
except ImportError:  # Python < 3.9
    ZONA_HORARIA = None

if ZONA_HORARIA is None:
    # Argentina no usa horario de verano desde 2009: UTC-3 fijo es equivalente.
    ZONA_HORARIA = timezone(timedelta(hours=-3), "ART")

FORMATO_TIMESTAMP = "%Y-%m-%d %H:%M:%S"


def ahora():
    """Fecha y hora actual en Buenos Aires (datetime con zona horaria)."""
    return datetime.now(ZONA_HORARIA)


def timestamp_ahora():
    """Fecha y hora actual en Buenos Aires como texto 'YYYY-MM-DD HH:MM:SS'."""
    return ahora().strftime(FORMATO_TIMESTAMP)


def ya_paso(fecha, hora):
    """True si el turno de esa fecha ('YYYY-MM-DD') y hora ('HH:MM') ya empezó.

    Un turno que empieza en el minuto actual también cuenta como pasado.
    """
    return f"{fecha} {hora}" <= ahora().strftime("%Y-%m-%d %H:%M")
