from app.database import get_db

TURNO_SELECT = """
    SELECT
    t.id,
    t.fecha,
    t.hora,
    t.precio,
    t.creado_en,
    c.id AS cliente_id,
    c.nombre,
    c.apellido,
    c.telefono,
    ca.id AS cancha_id,
    ca.nombre AS cancha_nombre

FROM turnos t

JOIN clientes c
    ON t.cliente_id = c.id

JOIN canchas ca
    ON t.cancha_id = ca.id
"""


def find_by_id(turno_id, db=None):
    owns_connection = db is None

    if owns_connection:
        db = get_db()

    try:
        row = db.execute(
            TURNO_SELECT + """
                WHERE t.id = ?
            """,
            (turno_id,)
        ).fetchone()

        return dict(row) if row else None

    finally:
        if owns_connection:
            db.close()


def exists(fecha, hora, cancha_id, db=None):
    owns_connection = db is None
    if owns_connection:
        db = get_db()
    try:
        row = db.execute(
            """
            SELECT id
            FROM turnos
            WHERE fecha = ?
            AND hora = ?
            AND cancha_id = ?
            """,
            (fecha, hora, cancha_id)
        ).fetchone()
        return row is not None
    finally:
        if owns_connection:
            db.close()


def create(cliente_id, cancha_id, fecha, hora, precio, db=None):
    owns_connection = db is None
    if owns_connection:
        db = get_db()
    try:
        cursor = db.execute(
            """
            INSERT INTO turnos
                (cliente_id, cancha_id, fecha, hora, precio)
            VALUES (?, ?, ?, ?, ?)
            """,
            (cliente_id, cancha_id, fecha, hora, precio)
        )
        if owns_connection:
            db.commit()
        return cursor.lastrowid
    finally:
        if owns_connection:
            db.close()


def delete(turno_id):
    db = get_db()
    try:
        db.execute("DELETE FROM turnos WHERE id = ?", (turno_id,))
        db.commit()
    finally:
        db.close()


def find_by_filters(fecha=None, nombre="", telefono="", cancha_id=None):
    db = get_db()
    try:
        query = TURNO_SELECT + " WHERE 1 = 1"
        params = []

        if fecha:
            query += " AND t.fecha = ?"
            params.append(fecha)

        if nombre:
            query += " AND (c.nombre LIKE ? OR c.apellido LIKE ?)"
            value = f"%{nombre}%"
            params.extend([value, value])

        if telefono:
            query += " AND c.telefono LIKE ?"
            params.append(f"%{telefono}%")

        if cancha_id:
            query += " AND t.cancha_id = ?"
            params.append(cancha_id)

        query += " ORDER BY t.fecha, t.hora, ca.id"

        rows = db.execute(query, params).fetchall()
        return [dict(row) for row in rows]
    finally:
        db.close()


def find_by_fecha(fecha):
    db = get_db()
    try:
        rows = db.execute(
            """
            SELECT
                t.id, t.hora, t.precio, t.cancha_id,
                c.nombre, c.apellido, c.telefono,
                ca.nombre AS cancha_nombre
            FROM turnos t
            JOIN clientes c ON t.cliente_id = c.id
            JOIN canchas ca ON t.cancha_id = ca.id
            WHERE t.fecha = ?
            ORDER BY t.hora, ca.id
            """,
            (fecha,)
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        db.close()


def count_by_hora(fecha):
    db = get_db()
    try:
        rows = db.execute(
            """
            SELECT hora, COUNT(*) AS cantidad
            FROM turnos
            WHERE fecha = ?
            GROUP BY hora
            """,
            (fecha,)
        ).fetchall()
        return {row["hora"]: row["cantidad"] for row in rows}
    finally:
        db.close()


def count_all():
    db = get_db()
    try:
        return db.execute("SELECT COUNT(*) FROM turnos").fetchone()[0]
    finally:
        db.close()