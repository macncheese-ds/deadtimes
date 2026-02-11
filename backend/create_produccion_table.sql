-- Crear tabla produccion nueva (reemplaza produccion_intervalos)
CREATE TABLE IF NOT EXISTS produccion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  modelo VARCHAR(50),
  inicio TIME,
  final TIME,
  fecha DATE,
  capacidad INT DEFAULT 0,
  acumulado INT DEFAULT 0,
  produccion INT DEFAULT 0,
  acumulado1 INT DEFAULT 0,
  delta INT DEFAULT 0,
  dt DECIMAL(10,2) DEFAULT 0.00,
  linea INT,
  scrap INT DEFAULT 0
);
