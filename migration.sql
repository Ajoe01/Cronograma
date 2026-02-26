-- =============================================
-- MIGRACIÓN: Agregar roles, finanzas y observaciones
-- Ejecutar esto en tu PostgreSQL
-- =============================================

-- 1. Agregar columna 'rol' a usuarios
ALTER TABLE cronograma.usuarios 
ADD COLUMN IF NOT EXISTS rol VARCHAR(50) DEFAULT 'miembro';

-- Roles disponibles: 'director_financiero', 'coordinador', 'miembro'

-- 2. Agregar columnas de observaciones a actividades
ALTER TABLE cronograma.actividades 
ADD COLUMN IF NOT EXISTS observaciones TEXT,
ADD COLUMN IF NOT EXISTS detalles TEXT;

-- 3. Crear tabla de finanzas
CREATE TABLE IF NOT EXISTS cronograma.finanzas (
    id                SERIAL PRIMARY KEY,
    fecha_compra      DATE NOT NULL,
    concepto          VARCHAR(300) NOT NULL,
    categoria         VARCHAR(100),
    proveedor         VARCHAR(200),
    cantidad          INTEGER DEFAULT 1,
    valor_unitario    DECIMAL(12,2) NOT NULL,
    valor_total       DECIMAL(12,2) NOT NULL,
    metodo_pago       VARCHAR(50),
    responsable       VARCHAR(100),
    observaciones     TEXT,
    factura           VARCHAR(100),
    creado_por        VARCHAR(100),
    creado_en         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modificado_por    VARCHAR(100),
    modificado_en     TIMESTAMP
);

-- 4. Índices para finanzas
CREATE INDEX IF NOT EXISTS idx_finanzas_fecha ON cronograma.finanzas(fecha_compra);
CREATE INDEX IF NOT EXISTS idx_finanzas_categoria ON cronograma.finanzas(categoria);

-- 5. Comentarios
COMMENT ON TABLE cronograma.finanzas IS 'Control financiero del proyecto';
COMMENT ON COLUMN cronograma.usuarios.rol IS 'director_financiero, coordinador, o miembro';
COMMENT ON COLUMN cronograma.actividades.observaciones IS 'Observaciones al completar la actividad';
COMMENT ON COLUMN cronograma.actividades.detalles IS 'Detalles adicionales de la actividad';
