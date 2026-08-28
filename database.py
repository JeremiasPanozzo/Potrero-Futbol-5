import sqlite3
import sys
from pathlib import Path

def get_data_dir() -> Path:
    """
    - Empaquetado como .exe  → C:/Users/<usuario>/AppData/Local/PotreroPro/
    - Corriendo como script  → carpeta del propio archivo .py
    """
    if getattr(sys, 'frozen', False):
        base = Path.home() / "AppData" / "Local" / "PotreroPro"
    else:
        base = Path(__file__).parent
    base.mkdir(parents=True, exist_ok=True)
    return base

DB_PATH = get_data_dir() / "futbol5.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS clientes (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre      TEXT    NOT NULL,
            apellido    TEXT    NOT NULL,
            telefono    TEXT    NOT NULL UNIQUE,
            creado_en   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS canchas (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre  TEXT    NOT NULL UNIQUE,
            activa  INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS turnos (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id  INTEGER NOT NULL REFERENCES clientes(id),
            cancha_id   INTEGER NOT NULL REFERENCES canchas(id),
            fecha       TEXT    NOT NULL,
            hora        TEXT    NOT NULL,
            precio      REAL    NOT NULL,
            creado_en   TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
            UNIQUE(fecha, hora, cancha_id)
        );
    """)
    conn.commit()
    _migrar_si_necesario(conn)
    _seed_cancha_default(conn)
    conn.close()
    print("Base de datos lista.")

def _migrar_si_necesario(conn):
    """
    Si la tabla turnos existe sin cancha_id (v1.0), la migra a v2.0.
    Crea 'Cancha 1' y reasigna todos los turnos históricos a ella.
    """
    cols = {r[1] for r in conn.execute("PRAGMA table_info(turnos)").fetchall()}
    if "cancha_id" in cols:
        return

    print("Migrando base de datos v1.0 → v2.0 (agregando canchas)...")
    conn.executescript("""
        INSERT OR IGNORE INTO canchas (id, nombre) VALUES (1, 'Cancha 1');

        ALTER TABLE turnos RENAME TO turnos_v1;

        CREATE TABLE turnos (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id  INTEGER NOT NULL REFERENCES clientes(id),
            cancha_id   INTEGER NOT NULL REFERENCES canchas(id),
            fecha       TEXT    NOT NULL,
            hora        TEXT    NOT NULL,
            precio      REAL    NOT NULL,
            creado_en   TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
            UNIQUE(fecha, hora, cancha_id)
        );

        INSERT INTO turnos (id, cliente_id, cancha_id, fecha, hora, precio, creado_en)
        SELECT id, cliente_id, 1, fecha, hora, precio, creado_en FROM turnos_v1;

        DROP TABLE turnos_v1;
    """)
    conn.commit()
    print("Migración completada. Turnos existentes asignados a 'Cancha 1'.")

def _seed_cancha_default(conn):
    n = conn.execute("SELECT COUNT(*) FROM canchas").fetchone()[0]
    if n == 0:
        conn.execute("INSERT INTO canchas (nombre) VALUES ('Cancha 1')")
        conn.commit()

if __name__ == "__main__":
    init_db()