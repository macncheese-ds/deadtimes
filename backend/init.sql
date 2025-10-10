CREATE DATABASE IF NOT EXISTS deadtimes;
USE deadtimes;

-- Users table for authentication (simulating gaffet scan)
CREATE TABLE IF NOT EXISTS users(
  id INT AUTO_INCREMENT PRIMARY KEY,
  num_empleado INT UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('empleado','tecnico','admin') DEFAULT 'empleado'
);

-- Deadtimes table for checklist-style tickets
CREATE TABLE IF NOT EXISTS deadtimes(
  id INT AUTO_INCREMENT PRIMARY KEY,
  hr DATETIME,
  ha DATETIME,
  hc DATETIME,
  descr VARCHAR(250),
  modelo VARCHAR(250),
  turno VARCHAR(250),
  linea ENUM('1','2','3','4'),
  nombre VARCHAR(100),
  num_empleado INT UNIQUE,
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
  causa VARCHAR(250),
  solucion TEXT,
  rate INT,
  deadtime INT,
  piezas INT,
  e_ser ENUM ('Excelente','Bueno','Regular','Malo','Muy Malo'),
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);
