# Corrección de Nombres de Modelos - Eliminación de Duplicados TOP/BOT

## Problema Identificado
Al crear tickets, los modelos se guardaban con nombres duplicados como:
- "FCM30 A Bot BOT" (debería ser solo "FCM30 A BOT")
- "IDB VARIANT H TOP TOP" (debería ser solo "IDB VARIANT H TOP")

Esto ocurría porque:
1. Los nombres de modelo en la base de datos incluían "Top"/"Bot" al final
2. El backend concatenaba automáticamente el campo `lado` al modelo
3. Resultado: duplicación de la información del lado

## Solución Implementada

### 1. Cambios en el Backend (Ya aplicados en el código)

**Archivo:** `backend/src/routes/deadtimes.js`

**Cambio:** Eliminada la concatenación automática del lado al modelo

```javascript
// ANTES:
const ladoValue = lado || '';
const storedModelo = modelo ? (ladoValue ? `${modelo} ${ladoValue}` : modelo) : '';

// AHORA:
const storedModelo = modelo || '';
```

El modelo ahora se guarda tal cual viene del frontend, sin agregar el lado.

### 2. Cambios en el Frontend (Ya aplicados en el código)

**Archivo:** `frontend/src/pages/Home.jsx`

**Cambio:** El selector de modelos ahora muestra claramente el lado entre paréntesis

```javascript
{modelos.map(mod => (
  <option key={mod.id} value={mod.modelo}>
    {mod.modelo} ({mod.lado})
  </option>
))}
```

Ejemplo visual en el dropdown:
- FCM30 A (BOT)
- FCM30 A (TOP)
- IDB VARIANT H (BOT)
- IDB VARIANT H (TOP)

### 3. Actualización de la Base de Datos

Tienes 2 opciones para actualizar los datos existentes:

#### Opción A: Actualizar registros existentes (Recomendado)

Ejecuta el script: `backend/fix_modelos.sql`

```bash
# En PowerShell, desde la raíz del proyecto
cd backend
# Conéctate a MySQL y ejecuta:
mysql -u root -p deadtimes < fix_modelos.sql
```

Este script:
- Actualiza todos los modelos existentes eliminando "Top", "Bot", "TOP", "BOT" del final
- Verifica que no haya duplicados
- Mantiene todos los tickets y datos históricos intactos

#### Opción B: Recrear la tabla (Solo si es necesario)

Si prefieres empezar desde cero, usa: `backend/modelos_corregidos.sql`

```sql
-- 1. Respaldar datos existentes
CREATE TABLE modelos_backup AS SELECT * FROM modelos;

-- 2. Vaciar la tabla
TRUNCATE TABLE modelos;

-- 3. Ejecutar el nuevo script
SOURCE backend/modelos_corregidos.sql;
```

## Resultado Final

Después de aplicar los cambios:

### En el formulario de creación:
- Se ve: "FCM30 A (BOT)" y "FCM30 A (TOP)" como opciones separadas
- El usuario selecciona claramente qué lado necesita

### En la base de datos (campo `modelo`):
- Se guarda: "FCM30 A"
- El lado se guarda por separado en el campo `lado`: "BOT" o "TOP"

### En los tickets:
- Campo `modelo`: "FCM30 A"
- Campo `lado`: "BOT" (almacenado pero no mostrado concatenado)
- Cuando necesites mostrarlo completo: `${modelo}` (sin concatenar lado automáticamente)

## Verificación

Para verificar que todo funciona correctamente:

1. **Verifica los modelos actualizados:**
```sql
SELECT linea, modelo, lado, COUNT(*) 
FROM modelos 
GROUP BY linea, modelo, lado 
ORDER BY linea, modelo, lado;
```

2. **Crea un ticket de prueba** y verifica que:
   - El dropdown muestra: "FCM30 A (BOT)" y "FCM30 A (TOP)"
   - Al crear el ticket, solo se guarda "FCM30 A" en el campo modelo
   - No hay duplicación de TOP/BOT

3. **Revisa tickets existentes** (si aplicaste fix_modelos.sql):
```sql
SELECT id, modelo, linea FROM deadtimes ORDER BY id DESC LIMIT 10;
```

## Notas Importantes

- ✅ El código del backend y frontend ya está corregido
- ✅ Los archivos SQL de corrección están listos
- ⚠️ Debes ejecutar el script SQL en tu base de datos
- 💡 Se recomienda hacer backup antes de ejecutar cualquier UPDATE masivo
- 📋 Los tickets existentes NO se ven afectados por este cambio
