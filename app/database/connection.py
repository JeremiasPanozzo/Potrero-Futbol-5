import sqlite3
from flask import current_app


def get_db():
    db = sqlite3.connect(current_app.config["DATABASE"])
    db.row_factory = sqlite3.Row
    # SQLite no aplica las claves foráneas salvo que se activen en cada conexión.
    db.execute("PRAGMA foreign_keys = ON")
    return db


def close_db(db):
    if db is not None:
        db.close()
