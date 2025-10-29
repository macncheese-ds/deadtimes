CREATE DATABASE IF NOT EXISTS deadtimes;
USE deadtimes;

-- Tabla de líneas
CREATE TABLE IF NOT EXISTS lineas(
  id INT AUTO_INCREMENT PRIMARY KEY,
  linea VARCHAR(200)
);

-- Insertar líneas predeterminadas si no existen
INSERT IGNORE INTO lineas (linea) VALUES 
  ('1'),
  ('2'),
  ('3'),
  ('4');

-- Tabla de descripciones
CREATE TABLE IF NOT EXISTS descripciones(
  id INT AUTO_INCREMENT PRIMARY KEY,
  descripcion VARCHAR(200)
);

-- Insertar descripciones predeterminadas si no existen
INSERT IGNORE INTO descripciones (descripcion) VALUES 
  ('Falla eléctrica'),
  ('Mantenimiento');

-- Tabla de equipos (ahora en la misma base de datos)
CREATE TABLE IF NOT EXISTS equipos(
  id INT AUTO_INCREMENT PRIMARY KEY,
  equipo VARCHAR(200)
);

-- Insertar equipos predeterminados si no existen
INSERT IGNORE INTO equipos (equipo) VALUES 
  ('Top loading'),
  ('Bottom loading'),
  ('Top laser marking'),
  ('Bottom solder paste printing'),
  ('Bottom solder paste inspection (SPI)'),
  ('Montadora'),
  ('Bottom automatical optical inspection (Pre AOI)'),
  ('Bottom reflow soldering'),
  ('Top automatical optical inspection (Post AOI)'),
  ('Bottom/top sideviewer'),
  ('Bottom/top unloading');

-- Tabla de modelos
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

-- Deadtimes table for checklist-style tickets
CREATE TABLE IF NOT EXISTS deadtimes(
  id INT AUTO_INCREMENT PRIMARY KEY,
  hr DATETIME,
  ha DATETIME,
  hc DATETIME,
  descr VARCHAR(250),
  modelo VARCHAR(250),
  turno VARCHAR(250),
  linea VARCHAR(200),
  nombre VARCHAR(100),
  num_empleado VARCHAR(200),
  equipo VARCHAR(250),
  mod1 BOOLEAN,
  mod2 BOOLEAN,
  mod3 BOOLEAN,
  mod4 BOOLEAN,
  mod5 BOOLEAN,
  mod6 BOOLEAN,
  mod7 BOOLEAN,
  mod8 BOOLEAN,
  mod9 BOOLEAN,
  mod10 BOOLEAN,
  mod11 BOOLEAN,
  mod12 BOOLEAN,
  pf ENUM('Total','Intermitente'),
  pa ENUM('Equipo','Linea'),
  clasificacion ENUM ('Equipo','Facilidades','Operacion','Procesos','Calidad','Materiales','Sistemas(IT)'),
  clas_others VARCHAR(250),
  priority VARCHAR(250),
  tecnico VARCHAR(250),
  num_empleado1 VARCHAR(200),
  causa VARCHAR(250),
  solucion TEXT,
  rate INT,
  deadtime INT,
  piezas INT,
  e_ser ENUM ('Excelente','Bueno','Regular','Malo','Muy Malo'),
  done BOOLEAN DEFAULT 0,
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);
