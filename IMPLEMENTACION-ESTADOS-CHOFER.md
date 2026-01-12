# Implementación del Nuevo Flujo de Estados de Chofer

## Resumen

Se implementó exitosamente el nuevo sistema de estados para choferes con las siguientes características:

### ✅ Cambios Implementados

#### 1. Nuevos Estados de Chofer

Se reemplazaron los estados antiguos por un nuevo conjunto de 9 estados:

**Estados del Flujo Normal:**
- `disponible` (reemplaza a `libre_o_disponible`)
- `cargando`
- `viajando`
- `descansando`
- `descargando`

**Estados Especiales (pueden aplicarse desde cualquier estado):**
- `licencia_anual`
- `franco` (reemplaza a `licencia_medica`)
- `equipo_en_reparacion` (reemplaza a `licencia_art`)
- `inactivo`

#### 2. Flujo de Estados Validado

El sistema ahora valida las transiciones de estados siguiendo este flujo:

```
DISPONIBLE → CARGANDO → VIAJANDO → DESCANSANDO → VIAJANDO → DESCARGANDO → DISPONIBLE
                           ↓            ↑             ↓
                        DESCARGANDO  (ciclo)      DISPONIBLE
```

Los estados especiales (licencias, inactivo) pueden aplicarse desde cualquier estado y solo pueden volver a `disponible`.

#### 3. Tracking de Descanso en Viajes

Se agregaron campos a la tabla `viajes` para rastrear los períodos de descanso:

- `hora_inicio_descanso`: Timestamp del inicio del descanso
- `hora_fin_descanso`: Timestamp del fin del descanso
- `horas_descanso`: Cálculo automático de horas descansadas (decimal 5,2)

**Lógica Automática:**
- Cuando el chofer cambia a `DESCANSANDO`: se registra `hora_inicio_descanso` en el viaje activo
- Cuando el chofer cambia de `DESCANSANDO` a `VIAJANDO`: se registra `hora_fin_descanso` y se calcula automáticamente `horas_descanso`

#### 4. Validación de Transiciones

El sistema valida las transiciones de estados:
- Transiciones normales siguen el flujo definido
- Estados especiales pueden aplicarse en cualquier momento
- Transiciones inválidas son rechazadas con un mensaje descriptivo
- El endpoint `/mi-estado` permite confirmación para transiciones inusuales

#### 5. Sincronización Chofer ↔ Viaje

Cuando un chofer cambia de estado, el viaje en curso se actualiza automáticamente:
- `CARGANDO` → viaje cambia a `CARGANDO`
- `VIAJANDO` → viaje cambia a `VIAJANDO`
- `DESCARGANDO` → viaje cambia a `DESCARGANDO`

#### 6. Captura de Toneladas Descargadas

El endpoint `/mi-estado` acepta el campo `toneladas_descargadas` cuando el chofer cambia a estado `DESCARGANDO`, actualizando automáticamente el viaje en curso.

### 📁 Archivos Modificados

1. **src/entities/chofer.entity.ts**
   - Actualizado enum `EstadoChofer` con nuevos valores
   - Cambiado default de `LIBRE_O_DISPONIBLE` a `DISPONIBLE`

2. **src/entities/viaje.entity.ts**
   - Agregados campos: `hora_inicio_descanso`, `hora_fin_descanso`, `horas_descanso`

3. **src/choferes/choferes.service.ts**
   - Actualizado array `estadosLicencia`
   - Implementado tracking automático de descanso en viajes
   - Actualizado método `validarProximoEstado()` con nuevas transiciones
   - Agregada validación de transiciones al método `actualizarEstado()`
   - Agregada sincronización de estado con viajes

4. **src/choferes/dto/update-estado-chofer.dto.ts** (creado)
   - DTO con validaciones para actualización de estado
   - Incluye validaciones para todos los campos opcionales

5. **src/viajes/viajes.service.ts**
   - Cambiado `LIBRE_O_DISPONIBLE` a `DISPONIBLE` en validaciones

6. **src/app.module.ts**
   - Mejorada configuración de conexión a PostgreSQL
   - Agregado connection pool con keep-alive y timeouts

### 📊 Scripts Creados

1. **scripts/migrate-estados-chofer.js**
   - Script de migración para agregar nuevos valores al enum
   - Migración de datos existentes
   - Agregado de campos de tracking a tabla viajes

2. **scripts/verify-estados.js**
   - Script de verificación del estado de la base de datos
   - Muestra valores del enum, choferes y estructura de tabla viajes

3. **test-estados-flow.js**
   - Pruebas completas del flujo de estados
   - Valida todas las transiciones normales
   - Verifica rechazo de transiciones inválidas
   - Prueba estados especiales

### 🎯 Endpoints Afectados

**Para Choferes:**
- `PATCH /api/v1/choferes/mi-estado`
  - Incluye validación con opción de confirmación
  - Acepta: `estado_chofer`, `razon_estado`, `fecha_inicio_licencia`, `fecha_fin_licencia`, `toneladas_descargadas`, `confirmado`

**Para Administradores:**
- `PATCH /api/v1/choferes/:id_chofer/estado`
  - Valida transiciones estrictamente (sin confirmación)
  - Acepta: `estado_chofer`, `razon_estado`

### ✅ Estado de la Implementación

- ✅ Enum actualizado
- ✅ Tabla viajes con campos de tracking
- ✅ Validación de transiciones
- ✅ Tracking automático de descanso
- ✅ Sincronización chofer ↔ viaje
- ✅ Captura de toneladas descargadas
- ✅ Todas las pruebas pasando correctamente
- ✅ Servidor funcionando sin errores

### 🧪 Resultados de Pruebas

```
✅ TODAS LAS PRUEBAS PASARON CORRECTAMENTE

✓ Login exitoso
✓ DISPONIBLE → CARGANDO (válido)
✓ CARGANDO → VIAJANDO (válido)
✓ VIAJANDO → DESCANSANDO (válido, registra inicio descanso)
✓ DESCANSANDO → VIAJANDO (válido, calcula horas descanso)
✓ VIAJANDO → DESCARGANDO (válido)
✓ DESCARGANDO → DISPONIBLE (válido)
✓ DISPONIBLE → DESCARGANDO (rechazado correctamente)
✓ DISPONIBLE → FRANCO (válido, estado especial)
✓ FRANCO → DISPONIBLE (válido)
```

### 📝 Notas Importantes

1. **Compatibilidad con Enum Antiguo:**
   - Los valores antiguos del enum (libre_o_disponible, licencia_medica, licencia_art) todavía existen en el enum de PostgreSQL pero no están en uso
   - Todos los choferes fueron migrados a los nuevos estados
   - Para eliminarlos completamente sería necesario recrear el enum (operación más compleja)

2. **Campos Deprecados en Tabla Choferes:**
   - Los campos `ultimo_inicio_descanso` y `ultimo_fin_descanso` ya no se usan
   - Se mantienen por compatibilidad
   - El tracking ahora se hace en la tabla `viajes`

3. **Validaciones:**
   - Estados de licencia requieren `fecha_inicio_licencia`
   - `fecha_fin_licencia` es opcional
   - El sistema valida que fecha_fin no sea anterior a fecha_inicio
   - Transiciones inválidas son rechazadas con mensaje descriptivo

## Próximos Pasos Recomendados

1. Actualizar frontend para usar nuevos estados
2. Implementar visualización de horas de descanso en el frontend
3. Considerar agregar reportes de horas de descanso por chofer
4. Evaluar si se necesita eliminar campos deprecados de la tabla choferes
