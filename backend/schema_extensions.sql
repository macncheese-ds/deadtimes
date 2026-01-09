-- ============================================================================
-- EXTENSIONES DE SCHEMA PARA DEADTIMES - NUEVA SECCIÓN PRODUCCIÓN
-- Tablas nuevas para producción por intervalos horarios y auditoría
-- MySQL 8.0+
-- Las tablas modelos, lineas, equipos, descripcion, deadtimes YA EXISTEN
-- ============================================================================

-- ============================================================================
-- 1. TABLA DE PRODUCCIÓN POR INTERVALOS HORARIOS
-- ============================================================================

-- Tabla: produccion_intervalos
-- Almacena un registro por intervalo (1 hora) de cada línea
-- Calcula automáticamente: deadtime basado en piezas faltantes
-- Fórmula deadtime: si (rate_acumulado - produccion_acumulada - scrap) > 0
--   entonces minutos = ((rate_acumulado - produccion_acumulada - scrap) / rate) * 60
--   sino 0
-- Fórmula porcentaje cumplimiento: (produccion_acumulada / rate_acumulado) * 100

CREATE TABLE IF NOT EXISTS produccion_intervalos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  linea VARCHAR(200) NOT NULL,
  fecha DATE NOT NULL,
  turno TINYINT NOT NULL,  -- 1 o 2
  hora_inicio TINYINT NOT NULL,  -- 0-23 (hora inicio del intervalo de 1h)
  modelo VARCHAR(250),  -- Modelo actual en ese intervalo (puede cambiar)
  producto VARCHAR(250),  -- Producto (autocompleta del modelo)
  rate INT DEFAULT 0,  -- piezas/hora en ese intervalo
  rate_acumulado INT DEFAULT 0,  -- suma acumulada rate desde inicio turno
  produccion INT DEFAULT 0,  -- piezas producidas en el intervalo (editable, requiere credencial)
  produccion_acumulada INT DEFAULT 0,  -- suma acumulada producción desde inicio turno
  scrap INT DEFAULT 0,  -- piezas defectuosas (editable, requiere credencial)
  delta INT DEFAULT 0,  -- (rate - produccion) - scrap = piezas faltantes en intervalo
  deadtime_minutos DECIMAL(10, 2) DEFAULT 0,  -- minutos perdidos calculados por piezas faltantes
  porcentaje_cumplimiento DECIMAL(5, 2) DEFAULT 0,  -- (produccion_acumulada / rate_acumulado) * 100
  justificado_minutos DECIMAL(10, 2) DEFAULT 0,  -- minutos justificados por tickets en ese intervalo
  tiempo_no_justificado DECIMAL(10, 2) DEFAULT 0,  -- deadtime_minutos - justificado_minutos
  num_empleado_produccion INT,  -- Quién editó producción (para auditoría)
  num_empleado_scrap INT,  -- Quién editó scrap (para auditoría)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_linea_fecha_turno_hora (linea, fecha, turno, hora_inicio),
  INDEX idx_linea_fecha (linea, fecha),
  INDEX idx_linea_turno (linea, turno),
  INDEX idx_fecha_turno (fecha, turno),
  INDEX idx_hora (hora_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. TABLA DE AUDITORÍA DE CAMBIOS
-- ============================================================================

-- Tabla: auditor_cambios
-- Registra cada cambio en tickets y registros de producción
-- Estructura:
--   - tabla_afectada: 'deadtimes', 'produccion_intervalos'
--   - registro_id: ID del registro modificado
--   - num_empleado: número de empleado que realizó el cambio
--   - nombre_usuario: nombre del usuario
--   - accion: 'INSERT', 'UPDATE', 'DELETE'
--   - campo: nombre del campo modificado (para UPDATE)
--   - valor_anterior: valor antes del cambio
--   - valor_nuevo: valor después del cambio
--   - ip_origen: IP del cliente
--   - timestamp: fecha/hora UTC

CREATE TABLE IF NOT EXISTS auditor_cambios (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tabla_afectada VARCHAR(50) NOT NULL,
  registro_id INT NOT NULL,
  num_empleado INT,
  nombre_usuario VARCHAR(255),
  accion ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
  campo VARCHAR(100),
  valor_anterior TEXT,
  valor_nuevo TEXT,
  ip_origen VARCHAR(45),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tabla_registro (tabla_afectada, registro_id),
  INDEX idx_num_empleado (num_empleado),
  INDEX idx_accion (accion),
  INDEX idx_timestamp (timestamp),
  INDEX idx_tabla_fecha (tabla_afectada, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. CONTROL DE ACCESO (EN TABLA credenciales.users)
-- ============================================================================

-- NOTA: La validación se hace contra credenciales.users (tabla existente)
-- Agregar columna en credenciales.users:
-- ALTER TABLE users ADD COLUMN editor BOOLEAN DEFAULT 1;
--
-- LÓGICA DE PERMISOS:
-- - EDITAR TICKETS (deadtimes): Requiere credenciales válidas + editor = 1
-- - EDITAR PRODUCCIÓN: Solo requiere credenciales válidas (cualquier empleado registrado)
--   Se registra en auditor_cambios quién editó y cuándo para auditoría
--
-- NO CREAR editar_whitelist: Usamos credenciales.users en su lugar

-- ============================================================================
-- 4. RELACIÓN ENTRE TICKETS Y INTERVALOS DE PRODUCCIÓN
-- ============================================================================

-- Tabla: ticket_produccion_relacion
-- Mapea qué tickets afectan qué intervalos de producción
-- Permite calcular deadtime justificado por ticket
-- Ejemplo: Un ticket abierto de 08:00 a 09:30 afecta intervalos 08:00-09:00 y 09:00-10:00

CREATE TABLE IF NOT EXISTS ticket_produccion_relacion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  intervalo_id INT NOT NULL,
  minutos_justificados DECIMAL(10, 2) DEFAULT 0,  -- minutos del ticket en ese intervalo
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_ticket_intervalo (ticket_id, intervalo_id),
  INDEX idx_ticket_id (ticket_id),
  INDEX idx_intervalo_id (intervalo_id),
  FOREIGN KEY (intervalo_id) REFERENCES produccion_intervalos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Los índices adicionales se pueden agregar después si es necesario

-- ============================================================================
-- QUERIES DE EJEMPLO PARA CÁLCULOS
-- ============================================================================

-- QUERY 1: Obtener tabla de producción por intervalo para una línea y turno
-- Retorna todos los intervalos con cálculos de rate, producción y deadtime
/*
SELECT 
  id,
  linea,
  fecha,
  turno,
  hora_inicio,
  modelo,
  producto,
  rate,
  rate_acumulado,
  produccion,
  produccion_acumulada,
  scrap,
  delta,
  deadtime_minutos,
  porcentaje_cumplimiento,
  justificado_minutos,
  tiempo_no_justificado
FROM produccion_intervalos
WHERE linea = 'Línea 1'
  AND fecha = CURDATE()
  AND turno = 1
ORDER BY hora_inicio ASC;
*/

-- QUERY 2: Calcular deadtime no justificado por intervalo (para sección Review)
-- Resta del deadtime total el tiempo ya justificado por tickets
/*
SELECT 
  pi.id,
  pi.linea,
  pi.fecha,
  pi.turno,
  pi.hora_inicio,
  pi.deadtime_minutos,
  COALESCE(SUM(tpr.minutos_justificados), 0) AS minutos_justificados,
  (pi.deadtime_minutos - COALESCE(SUM(tpr.minutos_justificados), 0)) AS tiempo_no_justificado
FROM produccion_intervalos pi
LEFT JOIN ticket_produccion_relacion tpr ON pi.id = tpr.intervalo_id
WHERE pi.linea = 'Línea 1'
  AND pi.fecha = CURDATE()
  AND pi.turno = 1
GROUP BY pi.id
ORDER BY pi.hora_inicio ASC;
*/

-- QUERY 3: Obtener tickets relacionados a un intervalo
/*
SELECT 
  d.id,
  d.descr,
  d.modelo,
  d.hr,
  d.hc,
  TIMESTAMPDIFF(MINUTE, d.hr, d.hc) as duracion_minutos,
  d.solucion
FROM deadtimes d
INNER JOIN ticket_produccion_relacion tpr ON d.id = tpr.ticket_id
WHERE tpr.intervalo_id = ?
  AND d.done = 1
ORDER BY d.hr DESC;
*/

-- QUERY 4: Calcular rate acumulado desde inicio de turno
-- Se ejecuta cuando se cambia el modelo en un intervalo
/*
SELECT SUM(rate) as rate_acumulado
FROM produccion_intervalos
WHERE linea = 'Línea 1'
  AND fecha = CURDATE()
  AND turno = 1
  AND hora_inicio <= 10;  -- hasta el intervalo 10:00
*/

-- QUERY 5: Validar autorización de empleado para editar
-- Se valida contra credenciales.users
/*
SELECT 
  num_empleado,
  nombre,
  editor
FROM credenciales.users
WHERE num_empleado = ?;
-- editor = 1: Puede editar tickets en deadtimes
-- editor = 0: Solo puede editar producción (queda auditado)
*/
