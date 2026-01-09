-- ============================================================================
-- 🚀 INSTRUCCIONES PARA APLICAR CAMBIOS - WHITELIST SIMPLIFICADO
-- ============================================================================
-- Ejecutar EN LA BD: credenciales
-- Tiempo: < 1 minuto
-- ============================================================================

-- PASO 1: Agregar columna editor a tabla users
-- ============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS editor BOOLEAN DEFAULT 1;

-- Verificar que se creó
DESCRIBE users;
-- Debe mostrar la columna "editor" con tipo BOOLEAN

-- ============================================================================
-- PASO 2: Agregar índice para performance
-- ============================================================================
ALTER TABLE users ADD INDEX IF NOT EXISTS idx_editor (editor);

-- ============================================================================
-- PASO 3: Visualizar estado actual
-- ============================================================================

-- Ver todos los usuarios
SELECT 
  num_empleado,
  nombre,
  rol,
  editor
FROM users
ORDER BY num_empleado;

-- ============================================================================
-- PASO 4: CONFIGURAR PERMISOS (Ajusta según tu necesidad)
-- ============================================================================

-- OPCIÓN A: Permitir edición de tickets SOLO a ingenieros y supervisores
UPDATE users SET editor = 1 WHERE rol IN ('Ingeniero', 'Supervisor', 'Líder', 'Jefe');
UPDATE users SET editor = 0 WHERE rol IN ('Operario', 'Auxiliar', 'Trainee', 'Técnico Operacional');

-- OPCIÓN B: Permitir edición de tickets a TODOS
UPDATE users SET editor = 1;

-- OPCIÓN C: Editar individualmente
UPDATE users SET editor = 1 WHERE num_empleado = 12345;  -- Permite editar
UPDATE users SET editor = 0 WHERE num_empleado = 54321;  -- Prohibe editar

-- ============================================================================
-- PASO 5: VERIFICAR CONFIGURACIÓN
-- ============================================================================

-- Ver quiénes pueden editar tickets
SELECT num_empleado, nombre, rol, editor FROM users WHERE editor = 1;

-- Ver quiénes NO pueden editar tickets
SELECT num_empleado, nombre, rol, editor FROM users WHERE editor = 0;

-- ============================================================================
-- PASO 6: ENTENDER LA LÓGICA
-- ============================================================================

-- EDITAR TICKETS (deadtimes):
-- Requiere: credenciales válidas + editor = 1
-- Lógica en backend produccion.js:
--   const user = validarCredenciales(numEmpleado, password);
--   if (!user) return error 401;
--   // Si llegó aquí, es válido - edita sin restricción adicional

-- EDITAR PRODUCCIÓN:
-- Requiere: credenciales válidas (sin validar editor)
-- Se registra en auditor_cambios quién editó
-- Lógica en backend produccion.js:
--   const user = validarCredenciales(numEmpleado, password);
--   if (!user) return error 401;
--   // Edita y audita automáticamente

-- ============================================================================
-- PASO 7: MONITOREAR CAMBIOS
-- ============================================================================

-- Ver quién editó producción y cuándo (auditoría)
SELECT 
  tabla_afectada,
  registro_id,
  num_empleado,
  nombre_usuario,
  campo,
  valor_anterior,
  valor_nuevo,
  timestamp
FROM auditor_cambios
WHERE tabla_afectada = 'produccion_intervalos'
ORDER BY timestamp DESC
LIMIT 10;

-- ============================================================================
-- REFERENCIA RÁPIDA DE CONSULTAS
-- ============================================================================

-- Ver usuario específico
SELECT * FROM users WHERE num_empleado = 12345;

-- Cambiar permiso de un usuario
UPDATE users SET editor = 0 WHERE num_empleado = 12345;

-- Resetear todos a editor = 1
UPDATE users SET editor = 1;

-- Contar cuántos pueden editar tickets
SELECT COUNT(*) as editores FROM users WHERE editor = 1;
SELECT COUNT(*) as sin_permiso FROM users WHERE editor = 0;

-- ============================================================================
-- DESPUÉS DE ESTO:
-- ============================================================================
-- 1. Reinicia backend: npm start (en c:\Marcelo\deadtimes\backend)
-- 2. Abre frontend: http://localhost:5173
-- 3. Click en "Producción"
-- 4. Prueba editar con un usuario (tiene que existir en credenciales.users)
-- 5. Verifica auditoría: SELECT * FROM auditor_cambios ORDER BY id DESC
-- 6. ¡Listo!
