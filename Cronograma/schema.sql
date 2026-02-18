-- =============================================
-- CRONOGRAMA UTB — schema.sql
-- Base de datos SQLite
-- Ejecutar solo si quieres crear la BD
-- manualmente (app.py lo hace automático)
-- =============================================

-- Tabla de usuarios (máximo 5)
CREATE TABLE IF NOT EXISTS usuarios (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user      TEXT    UNIQUE NOT NULL,       -- nombre de usuario único
    nombre    TEXT    NOT NULL,              -- nombre completo
    cargo     TEXT    NOT NULL,              -- cargo en el proyecto
    password  TEXT    NOT NULL,              -- contraseña hasheada (werkzeug)
    creado_en TEXT    DEFAULT (datetime('now'))
);

-- Tabla de actividades del cronograma
CREATE TABLE IF NOT EXISTS actividades (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre           TEXT    NOT NULL,           -- nombre de la actividad
    descripcion      TEXT,                        -- descripción opcional
    responsable      TEXT    NOT NULL,            -- persona a cargo
    fecha_inicio     TEXT    NOT NULL,            -- formato YYYY-MM-DD
    fecha_limite     TEXT    NOT NULL,            -- formato YYYY-MM-DD

    prioridad        TEXT    DEFAULT 'media',     -- alta / media / baja

    -- Estado de completado
    completada       INTEGER DEFAULT 0,           -- 0=no, 1=sí
    fecha_completado TEXT,                        -- fecha real de completado YYYY-MM-DD
    completada_por   TEXT,                        -- user que marcó como completada

    -- Auditoría
    creada_por       TEXT,                        -- user que creó la actividad
    creada_en        TEXT    DEFAULT (datetime('now'))
);

-- =============================================
-- LÓGICA DE COLORES (se calcula en JavaScript)
-- =============================================
-- Comparación: fecha_completado vs fecha_limite
-- diff = dias entre fecha_completado y fecha_limite
--
--  🟡 AMARILLO  → completada = 0     (en ejecución, default)
--  🔵 AZUL      → diff < -7          (prematuro: +7 días antes)
--  🟢 VERDE     → -7 <= diff <= 0    (a tiempo: hasta 7d antes y el día)
--  🟠 NARANJA   → 1 <= diff <= 7     (retraso leve: hasta 7d después)
--  🔴 ROJO      → diff > 7           (retraso grave: más de 7d después)
-- =============================================

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_act_fecha_limite   ON actividades (fecha_limite);
CREATE INDEX IF NOT EXISTS idx_act_completada     ON actividades (completada);
CREATE INDEX IF NOT EXISTS idx_usuarios_user      ON usuarios    (user);