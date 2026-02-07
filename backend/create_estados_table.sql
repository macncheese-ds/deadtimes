-- Crear tabla de estados de líneas
CREATE TABLE IF NOT EXISTS estados(
  id INT AUTO_INCREMENT PRIMARY KEY,
  linea VARCHAR(200),
  cambio_modelo BOOLEAN DEFAULT 0,
  mantenimiento BOOLEAN DEFAULT 0
);

-- Insertar líneas
INSERT INTO estados(linea) VALUES
("1"),
("2"),
("3"),
("4"),
("Tool Room"),
("X Ray");
