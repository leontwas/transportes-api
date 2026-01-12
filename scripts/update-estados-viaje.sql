-- Migración: Agregar nuevos estados a la tabla viajes
-- Fecha: 2026-01-07
-- Descripción: Agrega estados intermedios (cargando, viajando, descargando) al enum estado_viaje

-- 1. Ver el tipo enum actual
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'estado_viaje'::regtype::oid
ORDER BY enumsortorder;

-- 2. Agregar nuevos valores al enum si no existen
DO $$
BEGIN
    -- Agregar 'cargando' si no existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'cargando'
        AND enumtypid = 'estado_viaje'::regtype::oid
    ) THEN
        ALTER TYPE estado_viaje ADD VALUE 'cargando' BEFORE 'finalizado';
    END IF;

    -- Agregar 'viajando' si no existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'viajando'
        AND enumtypid = 'estado_viaje'::regtype::oid
    ) THEN
        ALTER TYPE estado_viaje ADD VALUE 'viajando' BEFORE 'finalizado';
    END IF;

    -- Agregar 'descargando' si no existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'descargando'
        AND enumtypid = 'estado_viaje'::regtype::oid
    ) THEN
        ALTER TYPE estado_viaje ADD VALUE 'descargando' BEFORE 'finalizado';
    END IF;
END $$;

-- 3. Verificar que se agregaron correctamente
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'estado_viaje'::regtype::oid
ORDER BY enumsortorder;

-- Resultado esperado:
-- en_curso
-- cargando
-- viajando
-- descargando
-- finalizado
-- en_reclamo
