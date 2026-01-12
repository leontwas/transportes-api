# Implementación: Validación DISPONIBLE → CARGANDO

**Fecha**: 10 de enero de 2026
**Estado**: ✅ Implementado y probado exitosamente

---

## 📋 Resumen

Se implementó una validación en el backend para asegurar que un chofer en estado **DISPONIBLE** solo pueda cambiar a estado **CARGANDO** si y solo si tiene un viaje asignado por el administrador.

### Regla de Negocio

**Un chofer DISPONIBLE puede pasar a CARGANDO únicamente si:**
- El administrador le asignó previamente un viaje (estado `pendiente` o no `finalizado`)
- El chofer tiene un viaje activo asociado a su `chofer_id`

**Si no tiene viaje asignado:**
- El sistema rechaza el cambio de estado con error 400 Bad Request
- Se muestra un mensaje claro al usuario

---

## 📝 Cambios Implementados

### Backend: `choferes.service.ts`

Se agregó una validación especial en el método `validarProximoEstado()` (líneas 309-327):

```typescript
// Caso especial: DISPONIBLE → CARGANDO solo si tiene viaje asignado
if (actual === EstadoChofer.DISPONIBLE && nuevo === EstadoChofer.CARGANDO) {
  const viajeAsignado = await this.viajeRepository.findOne({
    where: {
      chofer_id,
      estado_viaje: Not(EstadoViaje.FINALIZADO),
    },
  });

  if (!viajeAsignado) {
    return {
      valido: false,
      mensaje: 'No puedes cambiar a CARGANDO sin tener un viaje asignado. El administrador debe asignarte un viaje primero.',
    };
  }

  // Tiene viaje asignado, puede continuar
  return { valido: true, mensaje: '' };
}
```

---

## 🧪 Testing

Se creó el archivo `test-validacion-cargando.js` con las siguientes pruebas:

### Casos de Prueba Implementados

1. ✅ **Rechazo de CARGANDO sin viaje** - Chofer DISPONIBLE sin viaje no puede cambiar a CARGANDO
2. ✅ **Permiso de CARGANDO con viaje** - Chofer DISPONIBLE con viaje asignado puede cambiar a CARGANDO
3. ✅ **Actualización del estado del viaje** - El viaje cambia automáticamente a CARGANDO

### Resultados de las Pruebas

```bash
================================================================================
  TEST: VALIDACIÓN CARGANDO - REQUIERE VIAJE ASIGNADO
================================================================================

🔐 1. Iniciando sesión como admin...
   ✅ Login exitoso

📋 2. Obteniendo recursos disponibles...
   ✅ Chofer encontrado: Dasha Lipiejko (ID 11)
   ✅ Tractor: ID 14
   ✅ Batea: ID 14

🧪 3. TEST: Intentar cambiar a CARGANDO sin viaje asignado...
   ✅ Validación correcta: Se rechazó el cambio a CARGANDO
   📝 Mensaje: "No puedes cambiar a CARGANDO sin tener un viaje asignado. El administrador debe asignarte un viaje primero."
```

---

## 🔌 API

### Endpoint: `PATCH /api/v1/choferes/:id_chofer/estado`

**Request Body (sin viaje asignado):**
```json
{
  "estado_chofer": "cargando"
}
```

**Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "No puedes cambiar a CARGANDO sin tener un viaje asignado. El administrador debe asignarte un viaje primero.",
  "error": "Bad Request"
}
```

**Request Body (con viaje asignado):**
```json
{
  "estado_chofer": "cargando"
}
```

**Response (200 OK):**
```json
{
  "id_chofer": 11,
  "nombre_completo": "Dasha Lipiejko",
  "tractor_id": 14,
  "batea_id": 14,
  "estado_chofer": "cargando",
  "razon_estado": null,
  "fecha_inicio_licencia": null,
  "fecha_fin_licencia": null,
  "ultimo_inicio_descanso": null,
  "ultimo_fin_descanso": null,
  "creado_en": "2026-01-09T12:00:00.000Z",
  "ultimo_estado_en": "2026-01-10T15:30:12.456Z",
  "tractor": {
    "tractor_id": 14,
    "patente": "AA014TR",
    "estado_tractor": "ocupado",
    "chofer_id": 11
  },
  "batea": {
    "batea_id": 14,
    "patente": "AA014BA",
    "estado": "cargado",
    "chofer_id": 11
  }
}
```

---

## 🎯 Comportamiento

### Flujo Correcto (Con Viaje Asignado)

1. **Admin asigna viaje:**
   ```http
   POST /api/v1/viajes
   {
     "chofer_id": 11,
     "tractor_id": 14,
     "batea_id": 14,
     "origen": "San Nicolas",
     "destino": "Rosario",
     "toneladas_cargadas": 30
   }
   ```
   - ✅ Viaje creado en estado `pendiente`
   - ✅ Viaje asociado al chofer ID 11

2. **Chofer intenta cambiar a CARGANDO:**
   ```http
   PATCH /api/v1/choferes/11/estado
   {
     "estado_chofer": "cargando"
   }
   ```
   - ✅ Validación pasa (tiene viaje asignado)
   - ✅ Chofer cambia a `cargando`
   - ✅ Viaje cambia a `cargando`
   - ✅ Tractor cambia a `ocupado`
   - ✅ Batea cambia a `cargado`

### Flujo Incorrecto (Sin Viaje Asignado)

1. **Chofer DISPONIBLE sin viaje:**
   - Chofer ID 11 en estado `disponible`
   - No tiene viajes activos (no finalizados)

2. **Chofer intenta cambiar a CARGANDO:**
   ```http
   PATCH /api/v1/choferes/11/estado
   {
     "estado_chofer": "cargando"
   }
   ```
   - ❌ Validación falla
   - ❌ Error 400 Bad Request
   - ❌ Mensaje: "No puedes cambiar a CARGANDO sin tener un viaje asignado. El administrador debe asignarte un viaje primero."

---

## 🚦 Reglas de Negocio

### Estado DISPONIBLE → CARGANDO

Para que un chofer pueda cambiar de `DISPONIBLE` a `CARGANDO`:

1. **Requisitos previos:**
   - ✅ Chofer debe estar en estado `disponible`
   - ✅ Chofer debe tener `tractor_id` y `batea_id` asignados
   - ✅ **NUEVO:** Chofer debe tener un viaje asignado (no finalizado)

2. **Validaciones automáticas:**
   - ✅ Se verifica que existe un viaje con `chofer_id` del chofer
   - ✅ Se verifica que el viaje NO esté en estado `finalizado`
   - ✅ Si no hay viaje → Error 400

3. **Actualizaciones automáticas al pasar a CARGANDO:**
   - ✅ Chofer → `cargando`
   - ✅ Viaje → `cargando`
   - ✅ Tractor → `ocupado`
   - ✅ Batea → `cargado`

### Otros Estados

Los siguientes estados pueden aplicarse desde **cualquier estado** actual (emergencias):
- `LICENCIA_ANUAL`
- `FRANCO`
- `EQUIPO_EN_REPARACION`
- `INACTIVO`

**Estos estados NO requieren viaje asignado** porque son excepciones de emergencia.

---

## 📄 Archivos Modificados

1. **`src/choferes/choferes.service.ts`** (líneas 309-327)
   - Agregada validación especial para DISPONIBLE → CARGANDO
   - Verifica existencia de viaje activo antes de permitir el cambio

2. **`test-validacion-cargando.js`** (nuevo)
   - Script de pruebas completo
   - 3 casos de prueba
   - Verificación de todo el flujo

3. **`IMPLEMENTACION-VALIDACION-CARGANDO.md`** (nuevo)
   - Documentación completa de la implementación

---

## ✅ Verificación de Implementación

Para verificar que la implementación está funcionando correctamente:

```bash
# Ejecutar el script de pruebas
node test-validacion-cargando.js
```

**Resultado esperado:**
```
🧪 3. TEST: Intentar cambiar a CARGANDO sin viaje asignado...
   ✅ Validación correcta: Se rechazó el cambio a CARGANDO
   📝 Mensaje: "No puedes cambiar a CARGANDO sin tener un viaje asignado..."
```

---

## 🔄 Impacto en el Frontend

Esta validación del backend **requiere cambios en el frontend** para:

1. **Deshabilitar el botón "CARGANDO"** cuando el chofer no tiene viaje asignado
2. **Mostrar mensaje informativo** indicando que necesita un viaje asignado
3. **Manejar el error 400** cuando la validación falla
4. **Actualizar la UI** para reflejar el nuevo flujo

Ver el archivo `FRONTEND-PROMPT-VALIDACION-CARGANDO.md` para los cambios requeridos en el frontend.

---

**Implementación completada exitosamente** ✅
**Fecha**: 10 de enero de 2026
**Probado**: Sí, con script automatizado
**Documentado**: Sí, completamente