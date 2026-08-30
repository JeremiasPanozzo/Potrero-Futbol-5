from app.database import get_db

def find_by_telefono(telefono, db=None):
    owns_connection = db is None
    if owns_connection:
        db = get_db()
    try:
        row = db.execute(
            "SELECT * FROM clientes WHERE telefono = ?",
            (telefono,)
        ).fetchone()
        return dict(row) if row else None
    finally:
        if owns_connection:
            db.close()

def find_id_by_telefono(telefono):
    db = get_db()
    try:
        row = db.execute(
            """
            SELECT id
            FROM clientes
            WHERE telefono = ?
            """,
            (telefono,)
        ).fetchone()

        return row["id"] if row else None
    finally:
        db.close()

def create(nombre, apellido, telefono, db=None):
    owns_connection = db is None

    if owns_connection:
        db = get_db()

    try:
        cursor = db.execute(
            """
            INSERT INTO clientes
                (nombre, apellido, telefono)
            VALUES (?, ?, ?)
            """,
            (
                nombre,
                apellido,
                telefono
            )
        )
        if owns_connection:
            db.commit()    
        return cursor.lastrowid

    finally:
        if owns_connection:
            db.close()
