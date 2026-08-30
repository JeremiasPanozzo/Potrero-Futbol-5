from app.database import get_db


def find_all():
    db = get_db()
    try:
        rows = db.execute(
            """
            SELECT *
            FROM canchas
            ORDER BY id
            """
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        db.close()


def find_active():
    db = get_db()
    try:
        rows = db.execute(
            """
            SELECT *
            FROM canchas
            WHERE activa = 1
            ORDER BY id
            """
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        db.close()


def find_by_id(cancha_id):
    db = get_db()
    try:
        row = db.execute(
            """
            SELECT *
            FROM canchas
            WHERE id = ?
            """,
            (cancha_id,)
        ).fetchone()
        return dict(row) if row else None
    finally:
        db.close()


def find_active_by_id(cancha_id, db=None):
    owns_connection = db is None
    if owns_connection:
        db = get_db()
    try:
        row = db.execute(
            """
            SELECT *
            FROM canchas
            WHERE id = ?
            AND activa = 1
            """,
            (cancha_id,)
        ).fetchone()
        return dict(row) if row else None
    finally:
        if owns_connection:
            db.close()


def count_active():
    db = get_db()
    try:
        return db.execute(
            """
            SELECT COUNT(*)
            FROM canchas
            WHERE activa = 1
            """
        ).fetchone()[0]
    finally:
        db.close()


def count_turnos(cancha_id):
    db = get_db()
    try:
        return db.execute(
            """
            SELECT COUNT(*)
            FROM turnos
            WHERE cancha_id = ?
            """,
            (cancha_id,)
        ).fetchone()[0]
    finally:
        db.close()


def count_future_turnos(cancha_id, fecha):
    db = get_db()
    try:
        return db.execute(
            """
            SELECT COUNT(*)
            FROM turnos
            WHERE cancha_id = ?
            AND fecha >= ?
            """,
            (cancha_id, fecha)
        ).fetchone()[0]
    finally:
        db.close()


def create(nombre):
    db = get_db()
    try:
        cursor = db.execute(
            """
            INSERT INTO canchas (nombre)
            VALUES (?)
            """,
            (nombre,)
        )
        db.commit()
        return cursor.lastrowid
    finally:
        db.close()


def update(cancha_id, nombre=None, activa=None):
    db = get_db()
    try:
        if nombre is not None:
            db.execute(
                "UPDATE canchas SET nombre = ? WHERE id = ?",
                (nombre, cancha_id)
            )
        if activa is not None:
            db.execute(
                "UPDATE canchas SET activa = ? WHERE id = ?",
                (int(activa), cancha_id)
            )
        db.commit()
    finally:
        db.close()


def delete(cancha_id):
    db = get_db()
    try:
        db.execute("DELETE FROM canchas WHERE id = ?", (cancha_id,))
        db.commit()
    finally:
        db.close()