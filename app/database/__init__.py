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

        db.commit()

    finally:
        close_db(db)
