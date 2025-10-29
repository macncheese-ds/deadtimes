-- Migración: Agregar tabla modelos y campo done a deadtimes
USE deadtimes;

-- Crear tabla de modelos si no existe
CREATE TABLE IF NOT EXISTS modelos(
  id INT AUTO_INCREMENT PRIMARY KEY,
  modelo VARCHAR(200)
);

-- Insertar modelos predeterminados si no existen
INSERT IGNORE INTO modelos (modelo) VALUES 
  ('MGH100 RCU'),
  ('MGH100 BL7'),
  ('IDB PLOCK'),
  ('IDB MAIN'),
  ('IDB IPTS'),
  ('POWER PACK'),
  ('MGH MOCI'),
  ('MGH100 ESC'),
  ('FCM 30W'),
  ('MRR35'),
  ('IAMM'),
  ('IAMM2'),
  ('IAMMD'),
  ('FRHC');

-- Agregar campo done a la tabla deadtimes (compatible con MySQL/MariaDB)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'deadtimes' 
  AND TABLE_NAME = 'deadtimes' 
  AND COLUMN_NAME = 'done';

SET @query = IF(@col_exists = 0,
  'ALTER TABLE deadtimes ADD COLUMN done BOOLEAN DEFAULT 0 AFTER e_ser',
  'SELECT "Column done already exists" AS message');

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Actualizar tickets existentes basándose en hc (hora de cierre):
-- Si hc no es NULL, el ticket está cerrado -> done=1
UPDATE deadtimes SET done = 1 WHERE hc IS NOT NULL;

-- Si hc es NULL, el ticket está abierto -> done=0
UPDATE deadtimes SET done = 0 WHERE hc IS NULL;

-- Verificar resultados
SELECT 
  'Migración completada' as mensaje,
  (SELECT COUNT(*) FROM deadtimes WHERE done = 0) as tickets_abiertos,
  (SELECT COUNT(*) FROM deadtimes WHERE done = 1) as tickets_cerrados,
  (SELECT COUNT(*) FROM deadtimes WHERE done IS NULL) as tickets_sin_estado;
