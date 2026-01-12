-- Script para crear usuario chofer de prueba
-- Ejecutar este SQL antes de correr el test test-chofer-propio-acceso.js

-- 1. Verificar si el usuario ya existe
SELECT * FROM usuarios WHERE email = 'chofer.test@transporte.com';

-- 2. Si no existe, insertarlo
INSERT INTO usuarios (email, password, nombre_completo, rol, chofer_id, creado_en)
SELECT
  'chofer.test@transporte.com',
  '$2b$10$SIO58XQYUe1C48c2cbP9DObipcHtuD/We2lnpwkAsP2/qaqy1Rshu', -- chofer123
  'Chofer Test',
  'chofer',
  1, -- ID del primer chofer
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM usuarios WHERE email = 'chofer.test@transporte.com'
);

-- 3. Verificar que se creó correctamente
SELECT usuario_id, email, nombre_completo, rol, chofer_id
FROM usuarios
WHERE email = 'chofer.test@transporte.com';