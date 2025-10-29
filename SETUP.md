# Script de Configuración Rápida - Sistema Deadtimes con Credenciales

Este script te guiará a través de la configuración del sistema actualizado.

## Pre-requisitos

1. Base de datos `credenciales` debe existir y tener usuarios
2. MySQL/MariaDB corriendo en localhost:3306
3. Node.js instalado

## Pasos de Instalación

### 1. Migrar Base de Datos

Ejecuta el script de migración para actualizar la base de datos:

```bash
cd c:\app\deadtimes\backend
mysql -u root -p < migrate_to_credentials.sql
```

Esto hará:
- Eliminar la tabla `users` local (ya no se necesita)
- Actualizar el campo `num_empleado` para soportar formato "1234A"

### 2. Crear/Actualizar Tabla Equipos

Si es una instalación nueva, ejecuta:

```bash
mysql -u root -p < init.sql
```

Esto creará la tabla `equipos` y agregará los equipos predeterminados.

### 3. Configurar Variables de Entorno

Verifica que tu archivo `backend/.env` tenga:

```properties
PORT=8555
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password

DB_NAME=deadtimes
CRED_DB_NAME=credenciales
JWT_SECRET=6235642
JWT_EXPIRES_IN=8h
```

### 4. Instalar Dependencias y Ejecutar Backend

```bash
cd c:\app\deadtimes\backend
npm install
npm start
```

El servidor debe iniciar en el puerto 8555.

### 5. Instalar Dependencias y Ejecutar Frontend

En otra terminal:

```bash
cd c:\app\deadtimes\frontend
npm install
npm run dev
```

## Verificación

### Probar Login
1. Abre el navegador en la URL del frontend (típicamente http://localhost:5173)
2. Haz clic en "Escanear Gaffet para Iniciar Sesión"
3. Escanea un gaffet o escribe un número de empleado que exista en `credenciales.users`
4. Ingresa la contraseña
5. Deberías ver la pantalla principal con la lista de tickets

### Probar Creación de Ticket
1. Haz clic en "+ Nuevo Ticket"
2. Verifica que la lista de equipos se carga dinámicamente desde la base de datos
3. Completa el formulario y crea un ticket
4. El ticket debe aparecer en la lista de "Abiertos"

## Solución de Problemas

### Error: "Usuario no encontrado"
- Verifica que el usuario existe en `credenciales.users`
- Verifica que `CRED_DB_NAME=credenciales` está en el .env
- Verifica la conexión a la base de datos

### Error: Equipos no se cargan
- Verifica que la tabla `equipos` existe: `SELECT * FROM deadtimes.equipos;`
- Verifica que tiene datos: si está vacía, ejecuta el `init.sql`
- Revisa los logs del backend para errores de SQL

### Error: Token inválido
- Limpia localStorage del navegador
- Inicia sesión de nuevo

### Escaneo de gaffet no funciona en PDA
- Agrega `?debugScan=1` a la URL para ver logs
- Verifica que el escáner está configurado para enviar Enter al final
- Prueba pegar manualmente el número en el input invisible

## Comandos SQL Útiles

### Ver todos los equipos
```sql
USE deadtimes;
SELECT * FROM equipos ORDER BY equipo;
```

### Agregar un equipo
```sql
INSERT INTO equipos (equipo) VALUES ('Nuevo Equipo');
```

### Ver tickets recientes
```sql
SELECT id, hr, nombre, equipo, linea, modelo, descr 
FROM deadtimes 
WHERE hc IS NULL 
ORDER BY hr DESC 
LIMIT 10;
```

### Verificar usuarios en credenciales
```sql
USE credenciales;
SELECT num_empleado, nombre, rol FROM users LIMIT 10;
```

## Notas Adicionales

- El sistema ahora usa la misma base de credenciales que inventario, checklist y otros módulos
- Los equipos se gestionan desde la base de datos, no están hardcodeados
- El formato de num_empleado ahora es "1234A" en lugar de solo números
- Compatible con escáneres Zebra en dispositivos PDA

## Soporte

Para más información, consulta:
- `MIGRATION_CREDENTIALS.md` - Documentación completa de la migración
- `README.md` - Documentación general del sistema
