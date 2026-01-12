# 🚚 Frontend: Implementación del Flujo Estricto de Estados de Chofer

## 📋 Resumen Ejecutivo

El backend implementa un **flujo obligatorio y estricto** para los cambios de estado de los choferes que **garantiza el registro de horas de descanso** y el cumplimiento de las regulaciones de transporte.

### Flujo Obligatorio:
```
DISPONIBLE → CARGANDO → VIAJANDO → DESCANSANDO → VIAJANDO → DESCARGANDO → (VIAJANDO o DISPONIBLE)
```

## 🎯 Cambios Implementados en el Backend

### 1. Validación Estricta de Transiciones

El backend ahora **valida todas las transiciones** de estado y **rechaza aquellas que no siguen el flujo obligatorio**:

| Desde | Hacia | ¿Válido? | Nota |
|-------|-------|----------|------|
| DISPONIBLE | CARGANDO | ✅ | Cuando se asigna viaje |
| DISPONIBLE | VIAJANDO | ❌ | Debe pasar por CARGANDO primero |
| DISPONIBLE | DESCARGANDO | ❌ | Debe seguir el flujo completo |
| CARGANDO | VIAJANDO | ✅ | Inicia el viaje |
| CARGANDO | DISPONIBLE | ✅ | Puede cancelar antes de salir |
| VIAJANDO | DESCANSANDO | ✅ | **OBLIGATORIO** - registra inicio de descanso |
| VIAJANDO | DESCARGANDO | ❌ | Debe descansar primero |
| VIAJANDO | DISPONIBLE | ❌ | Debe completar el flujo |
| DESCANSANDO | VIAJANDO | ✅ | Cierra el descanso y calcula horas |
| DESCARGANDO | VIAJANDO | ✅ | Puede volver al origen |
| DESCARGANDO | DISPONIBLE | ✅ | Finaliza el viaje |

### 2. Tracking Automático de Descanso

- **Cuando marca DESCANSANDO**: Se registra `hora_inicio_descanso` en el viaje activo
- **Cuando vuelve a VIAJANDO**: Se registra `hora_fin_descanso` y se calcula automáticamente `horas_descanso`

### 3. Estados de Excepción

Los siguientes estados pueden aplicarse desde **cualquier estado** en caso de emergencia:
- `FRANCO`
- `LICENCIA_ANUAL`
- `EQUIPO_EN_REPARACION`
- `INACTIVO`

Estos estados siempre pueden volver a `DISPONIBLE`.

## 🎨 Cambios Necesarios en el Frontend

### 1. Actualizar Opciones de Estados Según el Estado Actual

El frontend debe **filtrar dinámicamente** las opciones de estado que el chofer puede seleccionar basándose en su estado actual.

#### Ejemplo de Lógica:

```typescript
// types/chofer.ts
export enum EstadoChofer {
  DISPONIBLE = 'disponible',
  CARGANDO = 'cargando',
  VIAJANDO = 'viajando',
  DESCANSANDO = 'descansando',
  DESCARGANDO = 'descargando',
  LICENCIA_ANUAL = 'licencia_anual',
  FRANCO = 'franco',
  EQUIPO_EN_REPARACION = 'equipo_en_reparacion',
  INACTIVO = 'inactivo',
}

// utils/estadosFlow.ts
export const getEstadosPermitidos = (estadoActual: EstadoChofer): EstadoChofer[] => {
  const estadosExcepcion = [
    EstadoChofer.LICENCIA_ANUAL,
    EstadoChofer.FRANCO,
    EstadoChofer.EQUIPO_EN_REPARACION,
    EstadoChofer.INACTIVO,
  ];

  const flujoNormal: Record<EstadoChofer, EstadoChofer[]> = {
    [EstadoChofer.DISPONIBLE]: [EstadoChofer.CARGANDO],
    [EstadoChofer.CARGANDO]: [EstadoChofer.VIAJANDO, EstadoChofer.DISPONIBLE],
    [EstadoChofer.VIAJANDO]: [EstadoChofer.DESCANSANDO],
    [EstadoChofer.DESCANSANDO]: [EstadoChofer.VIAJANDO],
    [EstadoChofer.DESCARGANDO]: [EstadoChofer.VIAJANDO, EstadoChofer.DISPONIBLE],
    [EstadoChofer.LICENCIA_ANUAL]: [EstadoChofer.DISPONIBLE],
    [EstadoChofer.FRANCO]: [EstadoChofer.DISPONIBLE],
    [EstadoChofer.EQUIPO_EN_REPARACION]: [EstadoChofer.DISPONIBLE],
    [EstadoChofer.INACTIVO]: [EstadoChofer.DISPONIBLE],
  };

  // Obtener estados permitidos del flujo normal
  const permitidos = flujoNormal[estadoActual] || [];

  // NOTA IMPORTANTE: VIAJANDO → DESCARGANDO requiere verificación en el backend
  // El backend verifica si el chofer ya registró su descanso antes de permitir DESCARGANDO
  // Si no pasó por DESCANSANDO, el backend rechazará la transición
  if (estadoActual === EstadoChofer.VIAJANDO) {
    // Solo mostrar DESCARGANDO si el backend lo permite
    // Por ahora, no mostramos DESCARGANDO hasta que pase por DESCANSANDO
    return [...permitidos, ...estadosExcepcion];
  }

  // Agregar estados de excepción (siempre disponibles)
  return [...permitidos, ...estadosExcepcion];
};
```

### 2. Mensajes de Usuario Claros

Cuando el backend rechace una transición, el frontend debe mostrar mensajes claros al usuario:

```typescript
// components/CambiarEstadoChofer.tsx (o similar)
const cambiarEstado = async (nuevoEstado: EstadoChofer) => {
  try {
    await api.patch(`/choferes/${choferId}/estado`, {
      estado_chofer: nuevoEstado,
      // otros campos...
    });

    Alert.alert('Éxito', 'Estado actualizado correctamente');
  } catch (error) {
    if (error.response?.status === 400) {
      // El backend rechazó la transición
      const mensaje = error.response.data.message || 'Transición de estado no permitida';

      Alert.alert(
        'Transición no permitida',
        mensaje,
        [{ text: 'Entendido', style: 'default' }]
      );
    } else {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  }
};
```

### 3. UI para el Flujo de Estados

#### a) Pantalla de Cambio de Estado con Selector Dinámico

```typescript
// screens/CambiarEstadoScreen.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { getEstadosPermitidos } from '../utils/estadosFlow';

const CambiarEstadoScreen = ({ chofer }) => {
  const [loading, setLoading] = useState(false);
  const estadosPermitidos = getEstadosPermitidos(chofer.estado_chofer);

  const labels: Record<EstadoChofer, string> = {
    [EstadoChofer.DISPONIBLE]: '🟢 Disponible',
    [EstadoChofer.CARGANDO]: '📦 Cargando',
    [EstadoChofer.VIAJANDO]: '🚛 Viajando',
    [EstadoChofer.DESCANSANDO]: '😴 Descansando',
    [EstadoChofer.DESCARGANDO]: '📥 Descargando',
    [EstadoChofer.LICENCIA_ANUAL]: '🏖️ Licencia Anual',
    [EstadoChofer.FRANCO]: '🏥 Franco',
    [EstadoChofer.EQUIPO_EN_REPARACION]: '🔧 Equipo en Reparación',
    [EstadoChofer.INACTIVO]: '⚫ Inactivo',
  };

  const handleCambiarEstado = async (nuevoEstado: EstadoChofer) => {
    // Mostrar confirmación
    Alert.alert(
      'Confirmar cambio de estado',
      `¿Está seguro de cambiar a ${labels[nuevoEstado]}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setLoading(true);
            try {
              await cambiarEstado(nuevoEstado);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Estado Actual</Text>
      <Text style={styles.estadoActual}>{labels[chofer.estado_chofer]}</Text>

      <Text style={styles.subtitle}>Seleccione nuevo estado:</Text>

      {estadosPermitidos.map((estado) => (
        <TouchableOpacity
          key={estado}
          style={styles.botonEstado}
          onPress={() => handleCambiarEstado(estado)}
          disabled={loading}
        >
          <Text style={styles.textoBoton}>{labels[estado]}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
```

#### b) Campo Adicional para DESCARGANDO

Cuando el chofer marca DESCARGANDO, debe poder ingresar las toneladas descargadas:

```typescript
const handleDescargando = () => {
  Alert.prompt(
    'Toneladas Descargadas',
    'Ingrese las toneladas descargadas:',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async (toneladas) => {
          const toneladasNum = parseFloat(toneladas);
          if (isNaN(toneladasNum) || toneladasNum <= 0) {
            Alert.alert('Error', 'Debe ingresar un número válido de toneladas');
            return;
          }

          await api.patch(`/choferes/${choferId}/estado`, {
            estado_chofer: EstadoChofer.DESCARGANDO,
            toneladas_descargadas: toneladasNum,
          });
        },
      },
    ],
    'plain-text',
    '',
    'numeric'
  );
};
```

#### c) Campos Adicionales para Estados de Licencia

Cuando se marca FRANCO, LICENCIA_ANUAL o EQUIPO_EN_REPARACION, deben solicitarse:
- `razon_estado` (obligatorio)
- `fecha_inicio_licencia` (obligatorio)
- `fecha_fin_licencia` (opcional)

```typescript
const handleEstadoLicencia = (nuevoEstado: EstadoChofer) => {
  // Mostrar formulario modal
  navigation.navigate('FormularioLicencia', {
    nuevoEstado,
    choferId,
  });
};

// En FormularioLicenciaScreen.tsx
const FormularioLicenciaScreen = ({ route }) => {
  const { nuevoEstado, choferId } = route.params;
  const [razon, setRazon] = useState('');
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [fechaFin, setFechaFin] = useState<Date | null>(null);

  const handleSubmit = async () => {
    if (!razon.trim()) {
      Alert.alert('Error', 'Debe ingresar una razón');
      return;
    }

    await api.patch(`/choferes/${choferId}/estado`, {
      estado_chofer: nuevoEstado,
      razon_estado: razon,
      fecha_inicio_licencia: fechaInicio.toISOString(),
      fecha_fin_licencia: fechaFin?.toISOString() || null,
    });
  };

  return (
    <View>
      <TextInput
        placeholder="Razón"
        value={razon}
        onChangeText={setRazon}
      />
      <DateTimePicker
        value={fechaInicio}
        onChange={setFechaInicio}
      />
      <DateTimePicker
        value={fechaFin || new Date()}
        onChange={setFechaFin}
      />
      <Button title="Confirmar" onPress={handleSubmit} />
    </View>
  );
};
```

### 4. Indicador Visual del Flujo

Mostrar al chofer el flujo completo y en qué punto se encuentra:

```typescript
// components/FlujoPaso.tsx
const FlujoPaso = ({ chofer }) => {
  const pasos = [
    { estado: EstadoChofer.DISPONIBLE, label: 'Disponible' },
    { estado: EstadoChofer.CARGANDO, label: 'Cargando' },
    { estado: EstadoChofer.VIAJANDO, label: 'Viajando' },
    { estado: EstadoChofer.DESCANSANDO, label: 'Descansando' },
    { estado: EstadoChofer.VIAJANDO, label: 'Viajando (retorno)' },
    { estado: EstadoChofer.DESCARGANDO, label: 'Descargando' },
    { estado: EstadoChofer.DISPONIBLE, label: 'Disponible' },
  ];

  const pasoActual = pasos.findIndex(p => p.estado === chofer.estado_chofer);

  return (
    <View style={styles.flujoContainer}>
      {pasos.map((paso, index) => (
        <View key={index} style={styles.paso}>
          <View
            style={[
              styles.circulo,
              index === pasoActual && styles.circuloActivo,
              index < pasoActual && styles.circuloCompletado,
            ]}
          >
            <Text style={styles.numeroPaso}>{index + 1}</Text>
          </View>
          <Text style={styles.labelPaso}>{paso.label}</Text>
          {index < pasos.length - 1 && <View style={styles.linea} />}
        </View>
      ))}
    </View>
  );
};
```

## 🔧 Endpoint `/api/v1/auth/me`

El endpoint `/api/v1/auth/me` **ya está implementado** en el backend y funciona correctamente.

### Request:
```http
GET /api/v1/auth/me
Authorization: Bearer {token}
```

### Response (Éxito 200):
```json
{
  "usuario_id": "uuid",
  "email": "chofer@transporte.com",
  "nombre": "Juan Pérez",
  "rol": "chofer",
  "chofer_id": 123
}
```

### Uso en el Frontend:

```typescript
// context/AuthContext.tsx
useEffect(() => {
  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const response = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(response.data);
      }
    } catch (error) {
      // Token inválido o expirado
      await AsyncStorage.removeItem('token');
      setUser(null);
    }
  };

  loadUser();
}, []);
```

## 📊 Respuestas del Backend

### Transición Válida (200 OK):
```json
{
  "id_chofer": 1,
  "nombre_completo": "Juan Pérez",
  "estado_chofer": "viajando",
  "razon_estado": null,
  "fecha_inicio_licencia": null,
  "fecha_fin_licencia": null,
  "ultimo_estado_en": "2026-01-09T18:45:30.000Z",
  // otros campos...
}
```

### Transición Inválida (400 Bad Request):
```json
{
  "statusCode": 400,
  "message": "Debe marcar DESCANSANDO antes de poder DESCARGAR. El sistema necesita registrar sus horas de descanso.",
  "error": "Bad Request"
}
```

## ✅ Checklist de Implementación Frontend

- [ ] Implementar `getEstadosPermitidos()` que filtre estados según el estado actual
- [ ] Actualizar pantalla de cambio de estado para mostrar solo opciones válidas
- [ ] Agregar campo de "toneladas descargadas" cuando se marca DESCARGANDO
- [ ] Agregar formulario de licencia (razón, fechas) para estados FRANCO, LICENCIA_ANUAL, etc.
- [ ] Implementar manejo de errores 400 con mensajes claros al usuario
- [ ] Agregar indicador visual del flujo de estados
- [ ] Verificar que `/auth/me` funcione correctamente
- [ ] Probar flujo completo: DISPONIBLE → CARGANDO → VIAJANDO → DESCANSANDO → VIAJANDO → DESCARGANDO → DISPONIBLE
- [ ] Probar que el sistema rechace transiciones inválidas (ej: DISPONIBLE → DESCARGANDO)
- [ ] Probar que los estados de excepción funcionen desde cualquier estado

## 🧪 Escenarios de Prueba

### Flujo Normal
1. Chofer está DISPONIBLE
2. Admin crea viaje → Chofer pasa a CARGANDO
3. Chofer marca VIAJANDO
4. Chofer marca DESCANSANDO (se registra hora inicio)
5. Chofer marca VIAJANDO (se calculan horas de descanso)
6. Chofer marca DESCARGANDO + ingresa toneladas
7. Chofer marca DISPONIBLE (finaliza)

### Transiciones Inválidas
1. Chofer DISPONIBLE intenta ir a DESCARGANDO → Rechazado
2. Chofer DISPONIBLE intenta ir a VIAJANDO → Rechazado
3. Chofer VIAJANDO intenta ir a DESCARGANDO (sin descanso) → Rechazado

### Estados de Excepción
1. Chofer en cualquier estado marca FRANCO + razón + fechas → Aceptado
2. Chofer en FRANCO marca DISPONIBLE → Aceptado

## 📝 Notas Importantes

1. **El flujo es OBLIGATORIO**: No es opcional. El backend rechazará cualquier intento de saltarse pasos.

2. **El descanso es OBLIGATORIO**: El sistema SIEMPRE requiere que el chofer pase por DESCANSANDO antes de DESCARGAR. Esto garantiza el cumplimiento de regulaciones.

3. **No hay bypass**: Incluso los administradores deben respetar el flujo. Solo los estados de excepción (FRANCO, etc.) pueden aplicarse en cualquier momento.

4. **El tracking es automático**: El backend registra automáticamente las horas de descanso. El chofer solo debe marcar los estados.

5. **Validación en tiempo real**: El backend valida cada transición y devuelve mensajes descriptivos si hay errores.

## 🎯 Beneficios de Esta Implementación

✅ **Cumplimiento garantizado**: El sistema fuerza el cumplimiento de regulaciones
✅ **Tracking preciso**: Las horas de descanso se registran automáticamente
✅ **UX clara**: Los choferes solo ven opciones válidas
✅ **Auditoría completa**: Cada cambio de estado queda registrado
✅ **Prevención de errores**: El backend rechaza transiciones inválidas

---

**Fecha de implementación**: 9 de enero de 2026
**Versión del backend**: Compatible con el flujo estricto de estados
