import sqlite3
from flask import current_app

def get_db():
    db = sqlite3.connect(
        current_app.config["DATABASE"]
    )
    
    db.row_factory = sqlite3.Row
    
    return db

def close_db(db):
    if db is not None:
        db.close()
