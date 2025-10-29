# Actualización del Sistema de Deadtimes - Integración con Credenciales y Equipos

## Cambios Realizados

### 1. Sistema de Autenticación con Credenciales
El sistema de deadtimes ahora utiliza la base de datos `credenciales` para la autenticación de usuarios, siguiendo el mismo patrón que los sistemas de inventario y checklist.

### 2. Tabla de Equipos en la Misma Base de Datos
- Se agregó la tabla `equipos` a la base de datos `deadtimes`
- Los equipos ahora se gestionan desde la misma base de datos en lugar de estar hardcodeados
- El frontend carga dinámicamente la lista de equipos desde la base de datos

### 3. Módulo de Login con Escaneo de Gaffet
- Se implementó el componente `LoginModal` con soporte para escaneo de gaffetes desde PDA
- Los usuarios ahora inician sesión escaneando su gaffet y luego ingresando su contraseña
- Compatible con escáneres Zebra y otros dispositivos PDA

### 4. Sistema de Roles
Los roles del sistema de credenciales se mapean de la siguiente manera:

| Rol en Credenciales | Rol en Deadtimes | Permisos |
|---------------------|------------------|----------|
| The Goat | admin | Acceso total |
| Administrador | admin | Acceso total |
| Lider | tecnico | Puede manejar y cerrar tickets |
| Operador | tecnico | Puede manejar y cerrar tickets |
| Invitado | empleado | Solo puede reportar tickets |

### 5. Campo num_empleado Actualizado
- El campo `num_empleado` en la tabla `deadtimes` se cambió de `INT` a `VARCHAR(20)`
- Ahora soporta el formato "1234A" que utiliza el sistema de credenciales
- Eliminado constraint UNIQUE que no era necesario (un empleado puede tener múltiples tickets)

## Archivos Modificados

### Backend
- `backend/init.sql` - Agregada tabla `equipos` y datos de ejemplo, actualizado campo `num_empleado`
- `backend/migrate_to_credentials.sql` - Script de migración para eliminar tabla `users` local
- `backend/.env` - Agregada variable `CRED_DB_NAME=credenciales`
- `backend/src/routes/auth.js` - Autenticación con credenciales, lookup de usuarios
- `backend/src/routes/deadtimes.js` - Agregado endpoint `/equipos` para listar equipos

### Frontend
- `frontend/src/api_deadtimes.js` - Funciones para lookup, login y obtener equipos
- `frontend/src/pages/Login.jsx` - Nueva interfaz con modal de escaneo
- `frontend/src/components/LoginModal.jsx` - Componente de escaneo de gaffet (adaptado de inventario)
- `frontend/src/pages/Home.jsx` - Carga dinámica de equipos desde la base de datos

## Migración

### Paso 1: Ejecutar script de migración
```bash
mysql -u root -p < backend/migrate_to_credentials.sql
```

### Paso 2: Reiniciar el servidor backend
```bash
cd backend
npm install
npm start
```

### Paso 3: Reconstruir frontend
```bash
cd frontend
npm install
npm run build
```

## Configuración de .env

Asegúrate de que tu archivo `backend/.env` tenga estas variables:

```properties
PORT=8555
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password

DB_NAME=deadtimes
CRED_DB_NAME=credenciales
JWT_SECRET=tu_secret
JWT_EXPIRES_IN=8h
```

## Estructura de la Base de Datos

### Tabla equipos
```sql
CREATE TABLE equipos(
  id INT AUTO_INCREMENT PRIMARY KEY,
  equipo VARCHAR(200)
);
```

Esta tabla contiene los equipos disponibles para seleccionar al crear un ticket. Los equipos predeterminados se insertan automáticamente al ejecutar `init.sql`.

### Tabla deadtimes (actualizada)
El campo `num_empleado` ahora es `VARCHAR(20)` para soportar el formato del sistema de credenciales (ej: "1234A").

## Gestión de Equipos

Para agregar nuevos equipos:
```sql
USE deadtimes;
INSERT INTO equipos (equipo) VALUES ('Nombre del Equipo');
```

Para ver todos los equipos:
```sql
SELECT * FROM equipos;
```

Para actualizar un equipo:
```sql
UPDATE equipos SET equipo = 'Nuevo Nombre' WHERE id = ?;
```

Para eliminar un equipo:
```sql
DELETE FROM equipos WHERE id = ?;
```

## Testing

Para probar el sistema:

1. Accede a la página de login
2. Haz clic en "Escanear Gaffet para Iniciar Sesión"
3. Escanea tu gaffet (o escribe manualmente tu número de empleado)
4. Ingresa tu contraseña
5. El sistema validará tus credenciales y te dará acceso según tu rol
6. Al crear un ticket, la lista de equipos se cargará dinámicamente desde la base de datos

## Soporte

Si encuentras problemas:
- Verifica que la base de datos `credenciales` existe y tiene usuarios
- Verifica que la variable `CRED_DB_NAME` en `.env` está configurada correctamente
- Verifica que la tabla `equipos` existe en la base de datos `deadtimes`
- Revisa los logs del servidor para errores de conexión

## Debug Mode

Para habilitar el modo debug en el escaneo de gaffetes, agrega `?debugScan=1` a la URL:
```
http://tu-servidor/deadtimes?debugScan=1
```

Esto mostrará información adicional sobre el proceso de escaneo y lookup de usuarios.
