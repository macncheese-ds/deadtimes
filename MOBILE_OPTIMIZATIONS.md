# Optimizaciones para Pantallas Pequeñas - Deadtimes App

## Cambios Implementados

### 1. **Componente Home.jsx**
- **Padding responsive**: Reducción de padding en móviles (p-2) hasta desktop (md:p-6)
- **Título responsive**: Texto más pequeño en móviles (text-xl) escalando hasta desktop (md:text-3xl)
- **Botones de navegación**: Layout vertical en móviles, horizontal en tablets+
- **Formulario de nuevo ticket**:
  - Grid de 1 columna en móviles, 2 columnas en tablets+
  - Todos los campos con ancho completo (w-full)
  - Tamaños de texto responsive (text-sm sm:text-base)
  - Checkboxes de montadoras: 3 columnas en móvil, 4 en tablet, 6 en desktop
  - Etiquetas acortadas para montadoras (M1, M2, etc.)
  - Botones de acción en columna en móviles, fila en tablets+
- **Lista de tickets**:
  - Layout vertical en móviles, horizontal en tablets+
  - Información del ticket en múltiples líneas en móviles
  - Botones de ancho completo en móviles
  - Texto escalable según tamaño de pantalla

### 2. **Componente HandleTicket.jsx**
- **Padding responsive**: p-2 → md:p-6
- **Título responsive**: text-xl → md:text-3xl
- **Grid de información**: 1 columna en móviles, 2 en tablets+
- **Formulario del técnico**:
  - Todos los campos con ancho completo (w-full)
  - Tamaños de texto responsive
  - Textarea más alto en móviles
  - Botón de finalizar de ancho completo en móviles

### 3. **Componente ViewTicket.jsx**
- **Padding responsive** en todos los niveles
- **Título responsive** con escalado de texto
- **Tabla responsive**:
  - Contenedor con scroll horizontal (overflow-x-auto)
  - Tamaños de texto escalables (text-xs → md:text-base)
  - Padding vertical en filas
  - Separadores visuales entre filas
- **Botones**:
  - Layout vertical en móviles
  - Ancho completo en móviles, auto en tablets+

## Breakpoints de Tailwind Utilizados

- **sm**: 640px (teléfonos en horizontal, tablets pequeñas)
- **md**: 768px (tablets)
- **lg**: 1024px (laptops)

## Características Principales

✅ **Touch-friendly**: Botones y áreas táctiles más grandes en móviles
✅ **Responsive text**: Texto escalable para mejor legibilidad
✅ **Flexible layouts**: De vertical (móvil) a horizontal (desktop)
✅ **Optimización de espacio**: Mejor uso del espacio limitado en móviles
✅ **Scroll horizontal**: Tablas largas con scroll en dispositivos pequeños

## Pruebas Recomendadas

1. **iPhone SE (375px)** - Pantalla pequeña
2. **iPhone 12/13 (390px)** - Pantalla media
3. **iPhone 14 Pro Max (430px)** - Pantalla grande
4. **iPad Mini (768px)** - Tablet pequeña
5. **iPad Pro (1024px)** - Tablet grande

## Acceso desde Dispositivos Móviles

La aplicación está disponible en:
- **Localhost**: http://localhost:8701
- **Red local**: http://[TU_IP]:8701 (ej: http://10.229.52.84:8701)

Asegúrate de que el servidor Nginx y el backend estén en ejecución.
