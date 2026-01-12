# Implementación: Restricción VIAJANDO y Confirmación Obligatoria

**Fecha**: 11 de enero de 2026
**Estado**: ✅ Implementado

---

## 📋 Resumen

Se implementaron dos nuevas características de seguridad para el cambio de estados de choferes:

1. **Restricción de Transición desde VIAJANDO**: Los choferes en estado `VIAJANDO` **NO pueden** cambiar directamente a `FRANCO` o `LICENCIA_ANUAL`. Deben completar el flujo del viaje primero.

2. **Confirmación Obligatoria**: **TODOS** los cambios de estado ahora requieren el campo `confirmado: true` en la petición. Esto asegura que los usuarios confirmen explícitamente cualquier cambio de estado.

---

## 🎯 Problema Resuelto

### Antes:
- Desde `VIAJANDO` se podía cambiar directamente a `FRANCO` o `LICENCIA_ANUAL` (estados de excepción)
- Los cambios de estado válidos no requerían confirmación explícita
- Solo las transiciones inválidas pedían confirmación

### Después:
- **Desde `VIAJANDO` NO se puede ir a `FRANCO` ni `LICENCIA_ANUAL`** → Se bloquea con mensaje descriptivo
- **TODOS los cambios de estado requieren `confirmado: true`** → Sin excepción
- Mayor seguridad y prevención de cambios accidentales

---

## 📝 Cambios Implementados

### Archivo: `src/choferes/choferes.service.ts`

#### 1. Nueva Restricción de Transición (líneas 297-304)

**Agregado al inicio de `validarProximoEstado()`:**

```typescript
private async validarProximoEstado(
  actual: EstadoChofer,
  nuevo: EstadoChofer,
  chofer_id: number,
): Promise<{ valido: boolean; mensaje: string }> {
  // Restricción especial: Desde VIAJANDO no se puede pasar a FRANCO ni LICENCIA_ANUAL
  if (actual === EstadoChofer.VIAJANDO &&
      (nuevo === EstadoChofer.FRANCO || nuevo === EstadoChofer.LICENCIA_ANUAL)) {
    return {
      valido: false,
      mensaje: 'No puedes cambiar de VIAJANDO a FRANCO o LICENCIA_ANUAL. Debes completar el viaje primero (pasar por DESCANSANDO → DESCARGANDO → ENTREGA_FINALIZADA → DISPONIBLE).',
    };
  }

  // Estados de excepción que pueden aplicarse desde cualquier estado (emergencias)
  const estadosExcepcion = [
    EstadoChofer.LICENCIA_ANUAL,
    EstadoChofer.FRANCO,
    EstadoChofer.EQUIPO_EN_REPARACION,
    EstadoChofer.INACTIVO,
  ];

  if (estadosExcepcion.includes(nuevo)) {
    return { valido: true, mensaje: '' };
  }
  // ... resto de la validación
}
```

**Explicación:**
- Se verifica **antes** de los estados de excepción
- Si el estado actual es `VIAJANDO` y el nuevo es `FRANCO` o `LICENCIA_ANUAL` → Rechazar
- Mensaje descriptivo indica el flujo correcto a seguir

#### 2. Confirmación Obligatoria (líneas 68-74)

**Modificado en `actualizarEstadoChofer()`:**

```typescript
async actualizarEstadoChofer(
  chofer_id: number,
  estado_chofer: EstadoChofer,
  razon_estado?: string,
  fecha_inicio_licencia?: Date,
  fecha_fin_licencia?: Date,
  confirmado?: boolean,
  toneladas_descargadas?: number,
) {
  // ... código anterior ...

  if (chofer.estado_chofer === estado_chofer) {
    throw new BadRequestException('El estado es el mismo que ya tiene');
  }

  // --- Requerimiento de Confirmación ---
  // Se requiere confirmación explícita para CUALQUIER cambio de estado
  if (!confirmado) {
    throw new BadRequestException(
      'Se requiere confirmación para cambiar de estado. Debes confirmar explícitamente este cambio.',
    );
  }

  // --- Validación de Secuencia de Estados ---
  const proximoEstado = await this.validarProximoEstado(chofer.estado_chofer, estado_chofer, chofer_id);

  if (!proximoEstado.valido) {
    throw new BadRequestException(proximoEstado.mensaje);
  }

  // ... resto del código ...
}
```

**Explicación:**
- La verificación `if (!confirmado)` se ejecuta **ANTES** de la validación de estados
- Ya no depende de si la transición es válida o no
- **Todos** los cambios de estado ahora requieren confirmación

---

## 🔌 API

### Endpoint: `PATCH /api/v1/choferes/:id_chofer/estado`

#### Caso 1: Intento de cambio sin confirmación ❌

**Request:**
```http
PATCH /api/v1/choferes/1/estado
Authorization: Bearer <token>
Content-Type: application/json

{
  "estado_chofer": "FRANCO",
  "fecha_inicio_licencia": "2026-01-15T00:00:00.000Z",
  "razon_estado": "Vacaciones"
}
```

**Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Se requiere confirmación para cambiar de estado. Debes confirmar explícitamente este cambio.",
  "error": "Bad Request"
}
```

#### Caso 2: Cambio válido con confirmación ✅

**Request:**
```http
PATCH /api/v1/choferes/1/estado
Authorization: Bearer <token>
Content-Type: application/json

{
  "estado_chofer": "FRANCO",
  "fecha_inicio_licencia": "2026-01-15T00:00:00.000Z",
  "razon_estado": "Vacaciones",
  "confirmado": true
}
```

**Response (200 OK):**
```json
{
  "message": "Estado del chofer actualizado correctamente",
  "chofer": {
    "id_chofer": 1,
    "nombre_completo": "Carlos Andrada",
    "estado_chofer": "FRANCO",
    "razon_estado": "Vacaciones",
    "fecha_inicio_licencia": "2026-01-15T00:00:00.000Z",
    "ultimo_estado_en": "2026-01-11T15:30:00.000Z"
  }
}
```

#### Caso 3: Restricción VIAJANDO → FRANCO ❌

**Request:**
```http
PATCH /api/v1/choferes/1/estado
Authorization: Bearer <token>
Content-Type: application/json

{
  "estado_chofer": "FRANCO",
  "fecha_inicio_licencia": "2026-01-15T00:00:00.000Z",
  "razon_estado": "Vacaciones",
  "confirmado": true
}
```

**Contexto:** El chofer está actualmente en estado `VIAJANDO`

**Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "No puedes cambiar de VIAJANDO a FRANCO o LICENCIA_ANUAL. Debes completar el viaje primero (pasar por DESCANSANDO → DESCARGANDO → ENTREGA_FINALIZADA → DISPONIBLE).",
  "error": "Bad Request"
}
```

#### Caso 4: Transición permitida desde VIAJANDO ✅

**Request:**
```http
PATCH /api/v1/choferes/1/estado
Authorization: Bearer <token>
Content-Type: application/json

{
  "estado_chofer": "DESCANSANDO",
  "confirmado": true
}
```

**Contexto:** El chofer está en estado `VIAJANDO`

**Response (200 OK):**
```json
{
  "message": "Estado del chofer actualizado correctamente",
  "chofer": {
    "id_chofer": 1,
    "nombre_completo": "Carlos Andrada",
    "estado_chofer": "DESCANSANDO",
    "ultimo_estado_en": "2026-01-11T15:35:00.000Z"
  }
}
```

---

## 🚦 Matriz de Transiciones desde VIAJANDO

| Estado Actual | Estado Nuevo | ¿Permitido? | Condición |
|--------------|--------------|-------------|-----------|
| **VIAJANDO** | DESCANSANDO | ✅ Sí | Requiere `confirmado: true` |
| **VIAJANDO** | DESCARGANDO | ✅ Sí | Solo si ya pasó por DESCANSANDO + `confirmado: true` |
| **VIAJANDO** | FRANCO | ❌ **NO** | Bloqueado - Debe completar viaje |
| **VIAJANDO** | LICENCIA_ANUAL | ❌ **NO** | Bloqueado - Debe completar viaje |
| **VIAJANDO** | EQUIPO_EN_REPARACION | ✅ Sí | Estado de emergencia + `confirmado: true` |
| **VIAJANDO** | INACTIVO | ✅ Sí | Estado de emergencia + `confirmado: true` |

---

## 🧪 Testing

### Script de Prueba: `test-restricciones-confirmacion-estados.js`

**Casos de prueba implementados:**

1. ✅ **Sin confirmación bloquea el cambio** - Cualquier estado sin `confirmado: true` → 400
2. ✅ **Con confirmación permite cambio válido** - Estado válido con `confirmado: true` → 200
3. ✅ **VIAJANDO → FRANCO bloqueado** - Incluso con `confirmado: true` → 400
4. ✅ **VIAJANDO → LICENCIA_ANUAL bloqueado** - Incluso con `confirmado: true` → 400
5. ✅ **VIAJANDO → DESCANSANDO permitido** - Con `confirmado: true` → 200

### Ejecutar el Test

```bash
node test-restricciones-confirmacion-estados.js
```

**Resultado esperado:**

```
================================================================================
  TEST: RESTRICCIONES Y CONFIRMACIÓN DE ESTADOS
================================================================================

🔐 1. Login como Admin...
   ✅ Login admin exitoso

👤 2. Buscando chofer para pruebas...
   ✅ Chofer encontrado: Carlos Andrada (ID 1)

🧪 3. TEST: Confirmación requerida para cambiar de estado...
   ✅ Correctamente bloqueado sin confirmación
   📝 Mensaje: "Se requiere confirmación para cambiar de estado. Debes confirmar explícitamente este cambio."

🧪 4. TEST: Con confirmación SÍ permite cambio válido...
   ✅ Cambio exitoso con confirmación
   📝 Nuevo estado: FRANCO

👤 5. Preparando chofer en estado VIAJANDO...
   ℹ️  Viaje creado: 123
   ✅ Chofer ahora está en estado VIAJANDO

🧪 6. TEST: Desde VIAJANDO NO se puede ir a FRANCO...
   ✅ Correctamente bloqueado VIAJANDO → FRANCO
   📝 Mensaje: "No puedes cambiar de VIAJANDO a FRANCO o LICENCIA_ANUAL. Debes completar el viaje primero..."

🧪 7. TEST: Desde VIAJANDO NO se puede ir a LICENCIA_ANUAL...
   ✅ Correctamente bloqueado VIAJANDO → LICENCIA_ANUAL
   📝 Mensaje: "No puedes cambiar de VIAJANDO a FRANCO o LICENCIA_ANUAL. Debes completar el viaje primero..."

🧪 8. TEST: Transiciones permitidas desde VIAJANDO...
   ✅ VIAJANDO → DESCANSANDO permitido correctamente
   📝 Nuevo estado: DESCANSANDO

================================================================================
  RESUMEN DE RESULTADOS
================================================================================

  1. ✅ Confirmación requerida para cambios de estado
  2. ✅ Con confirmación permite cambios válidos
  3. ✅ VIAJANDO → FRANCO bloqueado correctamente
  4. ✅ VIAJANDO → LICENCIA_ANUAL bloqueado correctamente
  5. ✅ VIAJANDO → DESCANSANDO permitido correctamente

  🎉 TODOS LOS TESTS PASARON EXITOSAMENTE

================================================================================
```

---

## 🎯 Flujo Correcto desde VIAJANDO

Si un chofer está en `VIAJANDO` y quiere tomar franco o licencia:

### ❌ Flujo Incorrecto (Bloqueado)
```
VIAJANDO → FRANCO ❌ Error 400
VIAJANDO → LICENCIA_ANUAL ❌ Error 400
```

### ✅ Flujo Correcto (Permitido)
```
VIAJANDO
  → DESCANSANDO (con confirmado: true)
  → VIAJANDO (volver después del descanso, con confirmado: true)
  → DESCARGANDO (con confirmado: true)
  → ENTREGA_FINALIZADA (con confirmado: true)
  → DISPONIBLE (automático)
  → FRANCO / LICENCIA_ANUAL (con confirmado: true)
```

---

## 📄 Archivos Modificados

1. **`src/choferes/choferes.service.ts`**
   - Agregada restricción especial VIAJANDO → FRANCO/LICENCIA_ANUAL (líneas 297-304)
   - Modificada lógica de confirmación obligatoria (líneas 68-74)

2. **`test-restricciones-confirmacion-estados.js`** (nuevo)
   - Script de pruebas completo
   - 5 casos de prueba
   - Verificación de restricciones y confirmación

3. **`IMPLEMENTACION-RESTRICCION-CONFIRMACION-ESTADOS.md`** (nuevo)
   - Documentación completa de la implementación

---

## ✅ Checklist de Implementación

### Backend (✅ Completado)
- [x] Agregada restricción VIAJANDO → FRANCO bloqueada
- [x] Agregada restricción VIAJANDO → LICENCIA_ANUAL bloqueada
- [x] Implementada confirmación obligatoria para todos los cambios
- [x] Tests automatizados funcionando
- [x] Documentación completa

### Frontend (📝 Pendiente - Ver siguiente sección)
- [ ] Actualizar todos los cambios de estado para incluir `confirmado: true`
- [ ] Implementar diálogo de confirmación antes de cambiar estado
- [ ] Agregar manejo específico de error para restricción VIAJANDO
- [ ] Testing del flujo completo

---

**Implementación completada exitosamente** ✅
**Fecha**: 11 de enero de 2026
**Probado**: Sí, con script automatizado
**Documentado**: Sí, completamente