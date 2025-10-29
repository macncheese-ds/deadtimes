USE deadtimes;

-- Agregar columna num_empleado1 si no existe
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'deadtimes' 
  AND TABLE_NAME = 'deadtimes' 
  AND COLUMN_NAME = 'num_empleado1'
);

SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE deadtimes ADD COLUMN num_empleado1 VARCHAR(200) AFTER tecnico',
  'SELECT "Column num_empleado1 already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migration completed: num_empleado1 column added/verified' AS status;
