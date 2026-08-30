-- app/database/schema.sql

CREATE TABLE IF NOT EXISTS canchas (
id INTEGER PRIMARY KEY AUTOINCREMENT,
nombre TEXT NOT NULL UNIQUE,
activa INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS clientes (
id INTEGER PRIMARY KEY AUTOINCREMENT,
nombre TEXT NOT NULL,
apellido TEXT NOT NULL,
telefono TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS turnos (
id INTEGER PRIMARY KEY AUTOINCREMENT,
cliente_id INTEGER NOT NULL,
cancha_id INTEGER NOT NULL,
fecha TEXT NOT NULL,
hora TEXT NOT NULL,
precio REAL NOT NULL,
creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

```
FOREIGN KEY (cliente_id)
    REFERENCES clientes(id)
    ON DELETE RESTRICT,

FOREIGN KEY (cancha_id)
    REFERENCES canchas(id)
    ON DELETE RESTRICT,

UNIQUE(fecha, hora, cancha_id)
```

);

CREATE INDEX IF NOT EXISTS idx_turnos_fecha
ON turnos(fecha);

CREATE INDEX IF NOT EXISTS idx_turnos_cancha
ON turnos(cancha_id);

CREATE INDEX IF NOT EXISTS idx_turnos_cliente
ON turnos(cliente_id);

CREATE INDEX IF NOT EXISTS idx_clientes_telefono
ON clientes(telefono);
