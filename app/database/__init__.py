from pathlib import Path
from .connection import get_db, close_db

__all__ = ["get_db", "close_db", "init_db",]

def init_db():
    schema_path = Path(__file__).with_name("schema.sql")
    db = get_db()

    try:
        with open(
            schema_path,
            "r",
            encoding="utf-8"
        ) as schema_file:
            db.executescript(
                schema_file.read()
            )

        _migrar(db)
        db.commit()

    finally:
        close_db(db)


def _migrar(db):
    """Aplica una sola vez los cambios de datos pendientes.

    PRAGMA user_version guarda qué migraciones ya se aplicaron.
    """
    version = db.execute("PRAGMA user_version").fetchone()[0]

    if version < 1:
        # Hasta ahora creado_en se guardaba en UTC (CURRENT_TIMESTAMP).
        # Se pasa a hora de Buenos Aires (UTC-3, sin horario de verano).
        db.execute(
            "UPDATE turnos SET creado_en = datetime(creado_en, '-3 hours')"
        )
        db.execute("PRAGMA user_version = 1")
