-- ============================================================================
-- ACTUALIZACIÓN BD CREDENCIALES - Agregar columna editor
-- Ejecutar en BD: credenciales
-- ============================================================================

-- Agregar columna editor a tabla users (si no existe)
-- editor = 1: Puede editar tickets en deadtimes
-- editor = 0: Solo puede ver, no editar tickets (pero SÍ puede editar producción)

ALTER TABLE users ADD COLUMN IF NOT EXISTS editor BOOLEAN DEFAULT 1;

-- Agregar índice para búsquedas rápidas
ALTER TABLE users ADD INDEX IF NOT EXISTS idx_editor (editor);

-- ============================================================================
-- PERMISOS RESULTANTES:
-- ============================================================================
-- EDITAR TICKETS EN DEADTIMES:
--   ✓ Credenciales válidas (num_empleado + password correcto)
--   ✓ AND editor = 1
-- 
-- EDITAR PRODUCCIÓN:
--   ✓ Credenciales válidas (num_empleado + password correcto)
--   ✓ editor = 0 o 1 (TODOS pueden editar, solo se registra en auditoría)
--
-- AUDITORÍA:
--   ✓ Cada edición registra: tabla, ID, num_empleado, acción, campo, antes/después, timestamp
--   ✓ Esto proporciona trazabilidad completa de quién editó qué y cuándo
-- ============================================================================

-- Verificar que la columna fue agregada
-- SELECT num_empleado, nombre, editor FROM users LIMIT 5;
