import sqlite3
from pathlib import Path

from .connection import get_db, close_db

__all__ = ["get_db", "close_db", "init_db"]


def init_db():
    schema_path = Path(__file__).with_name("schema.sql")
    db = get_db()

    try:
        with open(schema_path, "r", encoding="utf-8") as schema_file:
            db.executescript(schema_file.read())

        _migrar(db)
        db.commit()

    finally:
        close_db(db)


# ── Migraciones ──────────────────────────────────────────────────
# PRAGMA user_version guarda la última migración aplicada, así cada
# una corre una sola vez por base de datos.


def _migrar(db):
    version = db.execute("PRAGMA user_version").fetchone()[0]

    if version < 1:
        _migracion_1_zona_horaria(db)

    if version < 2:
        _migracion_2_restricciones_turnos(db)


def _migracion_1_zona_horaria(db):
    """creado_en se guardaba en UTC (CURRENT_TIMESTAMP).

    Se pasa a hora de Buenos Aires (UTC-3, sin horario de verano).
    """
    db.execute("UPDATE turnos SET creado_en = datetime(creado_en, '-3 hours')")
    db.execute("PRAGMA user_version = 1")
    db.commit()


_TURNOS_COLUMNAS = "id, cliente_id, cancha_id, fecha, hora, precio, creado_en"


def _migracion_2_restricciones_turnos(db):
    """Reconstruye la tabla turnos con sus restricciones.

    Un bloque de Markdown (```) en schema.sql hizo que SQLite tomara las
    claves foráneas y el UNIQUE(fecha, hora, cancha_id) como el nombre de
    una columna, así que nunca se aplicaron. SQLite no permite agregar
    restricciones a una tabla existente: hay que crearla de nuevo y
    copiar los datos.

    Antes de copiar, los turnos que violarían las restricciones (mismo
    horario y cancha repetidos, o cliente/cancha inexistente) se mueven a
    la tabla turnos_conflictos para revisarlos a mano. No se borra nada.
    """
    db.commit()

    if db.execute("SELECT COUNT(*) FROM turnos").fetchone()[0]:
        _respaldar(db, "antes-migracion-2")

    # Las claves foráneas se desactivan durante la reconstrucción
    # (procedimiento recomendado por SQLite). Fuera de la transacción.
    db.execute("PRAGMA foreign_keys = OFF")
    try:
        db.executescript(f"""
            BEGIN;

            CREATE TABLE IF NOT EXISTS turnos_conflictos (
                id INTEGER,
                cliente_id INTEGER,
                cancha_id INTEGER,
                fecha TEXT,
                hora TEXT,
                precio REAL,
                creado_en TEXT,
                motivo TEXT NOT NULL
            );

            INSERT INTO turnos_conflictos ({_TURNOS_COLUMNAS}, motivo)
            SELECT {_TURNOS_COLUMNAS}, 'cliente o cancha inexistente'
            FROM turnos
            WHERE cliente_id NOT IN (SELECT id FROM clientes)
               OR cancha_id NOT IN (SELECT id FROM canchas);

            DELETE FROM turnos
            WHERE id IN (SELECT id FROM turnos_conflictos);

            -- Ante horarios repetidos se conserva el turno más antiguo.
            INSERT INTO turnos_conflictos ({_TURNOS_COLUMNAS}, motivo)
            SELECT {_TURNOS_COLUMNAS}, 'horario y cancha duplicados'
            FROM turnos
            WHERE id NOT IN (
                SELECT MIN(id) FROM turnos GROUP BY fecha, hora, cancha_id
            );

            DELETE FROM turnos
            WHERE id IN (SELECT id FROM turnos_conflictos);

            CREATE TABLE turnos_nueva (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cliente_id INTEGER NOT NULL,
                cancha_id INTEGER NOT NULL,
                fecha TEXT NOT NULL,
                hora TEXT NOT NULL,
                precio REAL NOT NULL,
                creado_en TEXT NOT NULL DEFAULT (datetime('now', '-3 hours')),

                FOREIGN KEY (cliente_id)
                    REFERENCES clientes(id)
                    ON DELETE RESTRICT,

                FOREIGN KEY (cancha_id)
                    REFERENCES canchas(id)
                    ON DELETE RESTRICT,

                UNIQUE(fecha, hora, cancha_id)
            );

            INSERT INTO turnos_nueva ({_TURNOS_COLUMNAS})
            SELECT {_TURNOS_COLUMNAS} FROM turnos;

            DROP TABLE turnos;
            ALTER TABLE turnos_nueva RENAME TO turnos;

            CREATE INDEX IF NOT EXISTS idx_turnos_fecha ON turnos(fecha);
            CREATE INDEX IF NOT EXISTS idx_turnos_cancha ON turnos(cancha_id);
            CREATE INDEX IF NOT EXISTS idx_turnos_cliente ON turnos(cliente_id);

            PRAGMA user_version = 2;

            COMMIT;
        """)
    except Exception:
        db.rollback()
        raise
    finally:
        db.execute("PRAGMA foreign_keys = ON")

    conflictos = db.execute("SELECT COUNT(*) FROM turnos_conflictos").fetchone()[0]
    if conflictos:
        print(
            f"[migración] {conflictos} turno(s) con conflictos se movieron a "
            "la tabla turnos_conflictos para revisarlos."
        )
    else:
        db.execute("DROP TABLE turnos_conflictos")
        db.commit()


def _respaldar(db, sufijo):
    """Copia la base a <nombre>.<sufijo>.db junto al archivo original."""
    archivo = db.execute("PRAGMA database_list").fetchone()["file"]
    if not archivo:
        return  # base en memoria
    origen = Path(archivo)
    destino = origen.with_name(f"{origen.stem}.{sufijo}{origen.suffix}")
    if destino.exists():
        return
    copia = sqlite3.connect(destino)
    try:
        db.backup(copia)
    finally:
        copia.close()
