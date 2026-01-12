# Implementación: Estado "ENTREGA_FINALIZADA"

**Fecha**: 10 de enero de 2026
**Estado**: ✅ Implementado y probado exitosamente

---

## 📋 Resumen

Se implementó un nuevo estado en el flujo de choferes llamado **`ENTREGA_FINALIZADA`** que permite al chofer finalizar la entrega y registrar:
- Las **toneladas descargadas** reales
- La **fecha y hora de descarga** (timestamp automático)
- Actualización automática de estados de recursos (chofer → DISPONIBLE, tractor → LIBRE, batea → VACIO)
- **Mantenimiento de asignaciones** (tractor y batea siguen asignados al chofer)
- Finalización del viaje

---

## 🔄 Flujo Actualizado de Estados

El nuevo flujo completo es:

```
DISPONIBLE
   ↓
CARGANDO
   ↓
VIAJANDO
   ↓
DESCANSANDO (obligatorio)
   ↓
VIAJANDO (registra fin de descanso)
   ↓
DESCARGANDO
   ↓
ENTREGA_FINALIZADA (registra toneladas y fecha)
   ↓
DISPONIBLE (automático)
```

---

## 📝 Cambios Implementados

### 1. Entity: `chofer.entity.ts`

Se agregó el nuevo estado al enum:

```typescript
export enum EstadoChofer {
  DISPONIBLE = 'disponible',
  CARGANDO = 'cargando',
  VIAJANDO = 'viajando',
  DESCANSANDO = 'descansando',
  DESCARGANDO = 'descargando',
  ENTREGA_FINALIZADA = 'entrega_finalizada',  // ← NUEVO
  LICENCIA_ANUAL = 'licencia_anual',
  FRANCO = 'franco',
  EQUIPO_EN_REPARACION = 'equipo_en_reparacion',
  INACTIVO = 'inactivo',
}
```

### 2. Service: `choferes.service.ts`

#### 2.1 Validación de Transiciones Actualizada

```typescript
const secuencia: Record<EstadoChofer, EstadoChofer[]> = {
  [EstadoChofer.DISPONIBLE]: [EstadoChofer.CARGANDO],
  [EstadoChofer.CARGANDO]: [EstadoChofer.VIAJANDO, EstadoChofer.DISPONIBLE],
  [EstadoChofer.VIAJANDO]: [EstadoChofer.DESCANSANDO, EstadoChofer.DESCARGANDO],
  [EstadoChofer.DESCANSANDO]: [EstadoChofer.VIAJANDO],
  [EstadoChofer.DESCARGANDO]: [
    EstadoChofer.ENTREGA_FINALIZADA,  // ← NUEVO flujo principal
    EstadoChofer.VIAJANDO,
    EstadoChofer.DISPONIBLE
  ],
  [EstadoChofer.ENTREGA_FINALIZADA]: [EstadoChofer.DISPONIBLE],  // ← NUEVO
  // ... otros estados
};
```

#### 2.2 Lógica de Manejo de ENTREGA_FINALIZADA

Se agregó la siguiente lógica en el método `actualizarEstadoChofer()`:

```typescript
// --- Manejo de ENTREGA_FINALIZADA ---
if (estado_chofer === EstadoChofer.ENTREGA_FINALIZADA) {
  const viajeEnCurso = await this.viajeRepository.findOne({
    where: {
      chofer_id,
      estado_viaje: Not(EstadoViaje.FINALIZADO),
    },
    relations: ['chofer', 'tractor', 'batea'],
  });

  if (!viajeEnCurso) {
    throw new BadRequestException(
      'No puedes finalizar la entrega sin tener un viaje activo'
    );
  }

  if (!toneladas_descargadas || toneladas_descargadas <= 0) {
    throw new BadRequestException(
      'Debes proporcionar las toneladas descargadas (mayor a 0)'
    );
  }

  this.logger.log(`[ENTREGA_FINALIZADA] Finalizando viaje ${viajeEnCurso.id_viaje} con ${toneladas_descargadas} toneladas`);

  // Actualizar el viaje: toneladas, fecha descarga y estado finalizado
  await this.viajeRepository.update(
    { id_viaje: viajeEnCurso.id_viaje },
    {
      toneladas_descargadas,
      fecha_descarga: new Date(),
      estado_viaje: EstadoViaje.FINALIZADO,
    }
  );

  this.logger.log(`✓ Viaje ${viajeEnCurso.id_viaje}: ${toneladas_descargadas} toneladas, fecha descarga registrada, estado FINALIZADO`);

  // Actualizar estado del Tractor (mantiene asignación al chofer)
  if (viajeEnCurso.tractor) {
    await this.choferRepository.manager.query(
      'UPDATE tractores SET estado_tractor = $1 WHERE tractor_id = $2',
      ['libre', viajeEnCurso.tractor_id]
    );
    this.logger.log(`✓ Tractor ${viajeEnCurso.tractor.patente} ahora LIBRE (mantiene asignación al chofer)`);
  }

  // Actualizar estado de la Batea (mantiene asignación al chofer)
  if (viajeEnCurso.batea) {
    await this.choferRepository.manager.query(
      'UPDATE bateas SET estado = $1 WHERE batea_id = $2',
      ['vacio', viajeEnCurso.batea_id]
    );
    this.logger.log(`✓ Batea ${viajeEnCurso.batea.patente} ahora VACÍA (mantiene asignación al chofer)`);
  }

  // Actualizar el chofer a DISPONIBLE (mantiene tractor y batea asignados)
  updateData.estado_chofer = EstadoChofer.DISPONIBLE;

  this.logger.log(`✓ Chofer ${chofer.nombre_completo} ahora DISPONIBLE (mantiene tractor y batea asignados)`);
}
```

#### 2.3 Prevención de Sobrescritura

Se agregó una condición para **NO** sobrescribir los datos del viaje después de ENTREGA_FINALIZADA:

```typescript
// Actualizar estado del viaje si corresponde
// NO actualizar si es ENTREGA_FINALIZADA porque ya se actualizó manualmente con las toneladas y fecha
if (estado_chofer !== EstadoChofer.ENTREGA_FINALIZADA) {
  await this.actualizarEstadoViajeSegunChofer(chofer_id, estado_chofer);
}
```

#### 2.4 Actualización del Switch para Estado del Viaje

```typescript
switch (estado_chofer) {
  case EstadoChofer.CARGANDO:
    nuevoEstadoViaje = EstadoViaje.CARGANDO;
    break;
  case EstadoChofer.VIAJANDO:
    nuevoEstadoViaje = EstadoViaje.VIAJANDO;
    break;
  case EstadoChofer.DESCARGANDO:
    nuevoEstadoViaje = EstadoViaje.DESCARGANDO;
    break;
  case EstadoChofer.ENTREGA_FINALIZADA:  // ← NUEVO
    nuevoEstadoViaje = EstadoViaje.FINALIZADO;
    break;
}
```

#### 2.5 Mensajes de Error Descriptivos

```typescript
else if (actual === EstadoChofer.DESCARGANDO &&
         nuevo !== EstadoChofer.ENTREGA_FINALIZADA &&
         nuevo !== EstadoChofer.VIAJANDO &&
         nuevo !== EstadoChofer.DISPONIBLE) {
  mensajeError = 'Desde DESCARGANDO debe pasar a ENTREGA_FINALIZADA con las toneladas descargadas, o puede volver a VIAJANDO/DISPONIBLE.';
} else if (actual === EstadoChofer.ENTREGA_FINALIZADA &&
           nuevo !== EstadoChofer.DISPONIBLE) {
  mensajeError = 'Desde ENTREGA_FINALIZADA automáticamente pasa a DISPONIBLE.';
}
```

---

## 🧪 Testing

Se creó el archivo `test-entrega-finalizada.js` con las siguientes pruebas:

### Casos de Prueba Implementados

1. ✅ **Flujo completo de estados** - Verificar que se respete la secuencia completa
2. ✅ **Validación sin toneladas** - Rechazar si no se proporcionan toneladas
3. ✅ **Validación con toneladas <= 0** - Rechazar valores inválidos
4. ✅ **ENTREGA_FINALIZADA exitosa** - Con toneladas válidas (28.5)
5. ✅ **Viaje finalizado correctamente** - Estado = FINALIZADO
6. ✅ **Toneladas registradas** - toneladas_descargadas = 28.5
7. ✅ **Fecha descarga registrada** - fecha_descarga con timestamp
8. ✅ **Chofer disponible** - Estado = DISPONIBLE, mantiene tractor_id y batea_id
9. ✅ **Tractor libre** - Estado = LIBRE, mantiene chofer_id
10. ✅ **Batea vacía** - Estado = VACIO, mantiene chofer_id

### Resultados de las Pruebas

```
✅ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE

📝 Resumen del flujo:
   1. ✅ Viaje creado correctamente
   2. ✅ Flujo de estados respetado (CARGANDO → VIAJANDO → DESCANSANDO → VIAJANDO → DESCARGANDO)
   3. ✅ Validación sin toneladas funcionó
   4. ✅ Validación con toneladas <= 0 funcionó
   5. ✅ ENTREGA_FINALIZADA con toneladas válidas funcionó
   6. ✅ Viaje marcado como FINALIZADO
   7. ✅ Toneladas descargadas registradas (28.5)
   8. ✅ Fecha de descarga registrada
   9. ✅ Chofer DISPONIBLE (mantiene tractor y batea asignados)
   10. ✅ Tractor LIBRE (mantiene asignación al chofer)
   11. ✅ Batea VACÍA (mantiene asignación al chofer)
```

---

## 🔌 API

### Endpoint: `PATCH /api/v1/choferes/:id_chofer/estado`

**Request Body:**
```json
{
  "estado_chofer": "entrega_finalizada",
  "toneladas_descargadas": 28.5
}
```

**Validaciones:**
- El chofer debe estar en estado `DESCARGANDO`
- El chofer debe tener un viaje activo (no finalizado)
- `toneladas_descargadas` es **obligatorio** y debe ser > 0

**Response (200 OK):**
```json
{
  "id_chofer": 8,
  "nombre_completo": "Leonardo Daniel Lipiejko",
  "tractor_id": 2,
  "batea_id": 2,
  "estado_chofer": "disponible",
  "razon_estado": null,
  "fecha_inicio_licencia": null,
  "fecha_fin_licencia": null,
  "ultimo_inicio_descanso": null,
  "ultimo_fin_descanso": null,
  "creado_en": "2025-01-09T12:00:00.000Z",
  "ultimo_estado_en": "2026-01-10T13:26:58.738Z",
  "tractor": {
    "tractor_id": 2,
    "patente": "AA002TR",
    "estado_tractor": "libre",
    "chofer_id": 8
  },
  "batea": {
    "batea_id": 2,
    "patente": "AA002BA",
    "estado": "vacio",
    "chofer_id": 8
  }
}
```

**Errores:**

| Código | Mensaje |
|--------|---------|
| 400 | `Debes proporcionar las toneladas descargadas (mayor a 0)` |
| 400 | `No puedes finalizar la entrega sin tener un viaje activo` |
| 400 | `No puede cambiar de "disponible" a "entrega_finalizada"` |

---

## 📊 Datos Actualizados en el Viaje

Cuando se marca `ENTREGA_FINALIZADA`, el viaje se actualiza con:

```json
{
  "id_viaje": 18,
  "origen": "San Nicolas",
  "destino": "Rosario",
  "estado_viaje": "finalizado",  // ← Actualizado
  "toneladas_cargadas": 30,
  "toneladas_descargadas": 28.5,  // ← Actualizado (dato del chofer)
  "fecha_salida": "2026-01-10T13:26:38.000Z",
  "fecha_descarga": "2026-01-10T13:26:58.738Z",  // ← Actualizado (timestamp automático)
  "hora_inicio_descanso": "2026-01-10T13:26:45.123Z",
  "hora_fin_descanso": "2026-01-10T13:26:48.456Z",
  "horas_descanso": 0.05,  // Calculado por trigger
  "chofer_id": 8,
  "tractor_id": 2,
  "batea_id": 2
}
```

---

## 🎯 Comportamiento

### 1. Al Marcar ENTREGA_FINALIZADA

El sistema realiza las siguientes acciones **automáticamente**:

1. ✅ Valida que haya un viaje activo
2. ✅ Valida que se proporcionen toneladas descargadas > 0
3. ✅ Actualiza el viaje:
   - `toneladas_descargadas` = valor ingresado por el chofer
   - `fecha_descarga` = timestamp actual del sistema
   - `estado_viaje` = `FINALIZADO`
4. ✅ Actualiza el **tractor**: `estado_tractor = 'libre'` (mantiene `chofer_id`)
5. ✅ Actualiza la **batea**: `estado = 'vacio'` (mantiene `chofer_id`)
6. ✅ Actualiza el **chofer**:
   - `estado_chofer = 'disponible'`
   - Mantiene `tractor_id` y `batea_id` asignados
7. ✅ Registra logs de auditoría en el servidor

### 2. Actualización de Estados (Manteniendo Asignaciones)

**Antes de ENTREGA_FINALIZADA:**
```
Chofer: estado=descargando, tractor_id=2, batea_id=2
Tractor: estado=ocupado, chofer_id=8
Batea: estado=cargado, chofer_id=8
Viaje: estado=descargando
```

**Después de ENTREGA_FINALIZADA:**
```
Chofer: estado=disponible, tractor_id=2, batea_id=2 (MANTIENE ASIGNACIONES)
Tractor: estado=libre, chofer_id=8 (MANTIENE ASIGNACIÓN AL CHOFER)
Batea: estado=vacio, chofer_id=8 (MANTIENE ASIGNACIÓN AL CHOFER)
Viaje: estado=finalizado, toneladas_descargadas=28.5, fecha_descarga=2026-01-10T13:38:54.026Z
```

**⚠️ IMPORTANTE:** Los recursos NO se desasignan al finalizar la entrega. Solo cambian de estado:
- **Chofer**: Pasa a DISPONIBLE (listo para otro viaje con sus mismos recursos)
- **Tractor**: Pasa a LIBRE (disponible para otro viaje, pero sigue asignado al chofer)
- **Batea**: Pasa a VACIO (disponible para otro viaje, pero sigue asignada al chofer)

**Las desasignaciones solo ocurren cuando:**
- El admin desasigna manualmente los recursos
- El chofer marca su estado como "EQUIPO_EN_REPARACION"

### 3. Logs del Servidor

```log
[ChoferesService] [ENTREGA_FINALIZADA] Finalizando viaje 18 con 28.5 toneladas
[ChoferesService] ✓ Viaje 18: 28.5 toneladas, fecha descarga registrada, estado FINALIZADO
[ChoferesService] ✓ Tractor AA002TR ahora LIBRE (mantiene asignación al chofer)
[ChoferesService] ✓ Batea AA002BA ahora VACÍA (mantiene asignación al chofer)
[ChoferesService] ✓ Chofer Leonardo Daniel Lipiejko ahora DISPONIBLE (mantiene tractor y batea asignados)
```

---

## 🚦 Reglas de Negocio

### Estados de Excepción

Los siguientes estados pueden aplicarse desde **cualquier estado** actual (emergencias):
- `LICENCIA_ANUAL`
- `FRANCO`
- `EQUIPO_EN_REPARACION`
- `INACTIVO`

### Flujo Estricto

El flujo normal **DEBE** respetarse:
1. DESCANSANDO es **obligatorio** antes de poder DESCARGAR
2. ENTREGA_FINALIZADA es el único camino para finalizar el viaje correctamente
3. No se puede saltar estados en el flujo normal

### Validación de Descanso

El sistema verifica que el chofer haya completado su descanso antes de permitir DESCARGANDO:
```typescript
if (viajeEnCurso.hora_inicio_descanso && viajeEnCurso.hora_fin_descanso) {
  // Puede descargar
} else {
  throw new BadRequestException(
    'Debe marcar DESCANSANDO antes de poder DESCARGAR'
  );
}
```

---

## 📱 Integración Frontend

### Ejemplo de Llamada API

```javascript
const finalizarEntrega = async (choferId, toneladasDescargadas) => {
  try {
    const response = await axios.patch(
      `${API_URL}/choferes/${choferId}/estado`,
      {
        estado_chofer: 'entrega_finalizada',
        toneladas_descargadas: toneladasDescargadas,
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    console.log('Entrega finalizada:', response.data);
    // El chofer ahora está DISPONIBLE
    // El viaje está FINALIZADO con toneladas y fecha registrados

  } catch (error) {
    if (error.response?.status === 400) {
      alert(error.response.data.message);
    }
  }
};
```

### Modal de Confirmación (Recomendado)

```jsx
const ConfirmarEntregaModal = ({ chofer, viaje, onConfirm }) => {
  const [toneladas, setToneladas] = useState('');

  const handleSubmit = () => {
    if (!toneladas || parseFloat(toneladas) <= 0) {
      alert('Ingrese un valor válido de toneladas');
      return;
    }
    onConfirm(parseFloat(toneladas));
  };

  return (
    <div>
      <h3>Finalizar Entrega</h3>
      <p>Viaje: {viaje.origen} → {viaje.destino}</p>
      <p>Toneladas cargadas: {viaje.toneladas_cargadas}</p>

      <label>Toneladas Descargadas:</label>
      <input
        type="number"
        step="0.1"
        min="0.1"
        value={toneladas}
        onChange={(e) => setToneladas(e.target.value)}
        placeholder="Ej: 28.5"
      />

      <button onClick={handleSubmit}>Confirmar</button>
      <button onClick={() => close()}>Cancelar</button>
    </div>
  );
};
```

---

## 📄 Archivos Modificados

1. **`src/entities/chofer.entity.ts`**
   - Agregado estado `ENTREGA_FINALIZADA` al enum

2. **`src/choferes/choferes.service.ts`**
   - Actualizada validación de transiciones de estado
   - Agregada lógica de manejo de ENTREGA_FINALIZADA
   - Actualizado switch de estados del viaje
   - Agregados mensajes de error descriptivos
   - Agregada prevención de sobrescritura del viaje

3. **`test-entrega-finalizada.js`** (nuevo)
   - Script de pruebas completo
   - 10 casos de prueba
   - Verificación de todo el flujo

4. **`IMPLEMENTACION-ENTREGA-FINALIZADA.md`** (nuevo)
   - Documentación completa de la implementación

---

## ✅ Verificación de Implementación

Para verificar que la implementación está funcionando correctamente:

```bash
# Ejecutar el script de pruebas
node test-entrega-finalizada.js
```

**Resultado esperado:** ✅ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE

---

## 🔄 Próximos Pasos (Frontend)

1. **Crear botón "Finalizar Entrega"** en la interfaz del chofer
2. **Mostrar modal** solicitando las toneladas descargadas
3. **Validar input** (número positivo)
4. **Hacer la llamada API** con el estado y las toneladas
5. **Actualizar UI** cuando la respuesta sea exitosa
6. **Mostrar en tabla de informes** los datos de toneladas descargadas y fecha/hora

---

**Implementación completada exitosamente** ✅
**Fecha**: 10 de enero de 2026
**Probado**: Sí, con script automatizado
**Documentado**: Sí, completamente