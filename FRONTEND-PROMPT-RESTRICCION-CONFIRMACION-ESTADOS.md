# Frontend: Implementar Restricción y Confirmación de Estados

**Fecha**: 11 de enero de 2026
**Para**: Aplicación Frontend React Native

---

## 📋 Cambios en el Backend

El backend ahora implementa dos nuevas reglas de negocio para cambios de estado:

### 1. Confirmación Obligatoria
**TODOS** los cambios de estado ahora requieren el campo `confirmado: true` en la petición.

### 2. Restricción desde VIAJANDO
Los choferes en estado `VIAJANDO` **NO pueden** cambiar directamente a `FRANCO` o `LICENCIA_ANUAL`.

---

## 🎯 Objetivos del Frontend

1. ✅ Mostrar **diálogo de confirmación** antes de CUALQUIER cambio de estado
2. ✅ Enviar `confirmado: true` en todas las peticiones de cambio de estado
3. ✅ Manejar el error específico de restricción VIAJANDO → FRANCO/LICENCIA_ANUAL
4. ✅ Mostrar mensaje descriptivo del flujo correcto cuando se bloquea la transición

---

## 📝 Implementación Requerida

### 1. Servicio de Cambio de Estado

**Archivo**: `services/choferService.js` (o equivalente)

```javascript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

/**
 * Cambia el estado de un chofer
 * IMPORTANTE: Siempre debe incluir confirmado: true
 */
export const cambiarEstadoChofer = async (choferId, estadoData) => {
  const token = await AsyncStorage.getItem('token');

  // IMPORTANTE: Siempre incluir confirmado: true
  const payload = {
    ...estadoData,
    confirmado: true,  // ← OBLIGATORIO desde el backend
  };

  const response = await axios.patch(
    `${API_URL}/choferes/${choferId}/estado`,
    payload,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  return response.data;
};
```

---

### 2. Hook de Confirmación de Estado

**Archivo**: `hooks/useConfirmacionEstado.js`

```javascript
import { useState } from 'react';
import { Alert } from 'react-native';

/**
 * Hook para manejar confirmación de cambios de estado
 */
export const useConfirmacionEstado = () => {
  const [cargando, setCargando] = useState(false);

  /**
   * Muestra diálogo de confirmación antes de cambiar estado
   *
   * @param {string} estadoActual - Estado actual del chofer
   * @param {string} estadoNuevo - Estado al que se quiere cambiar
   * @param {Function} onConfirmar - Callback que ejecuta el cambio
   */
  const confirmarCambioEstado = (estadoActual, estadoNuevo, onConfirmar) => {
    const mensajesPorEstado = {
      'DISPONIBLE': 'disponible para nuevos viajes',
      'CARGANDO': 'cargando mercadería',
      'VIAJANDO': 'viajando',
      'DESCANSANDO': 'en descanso',
      'DESCARGANDO': 'descargando mercadería',
      'FRANCO': 'de franco',
      'LICENCIA_ANUAL': 'de licencia anual',
      'EQUIPO_EN_REPARACION': 'con equipo en reparación',
      'INACTIVO': 'inactivo',
    };

    const textoEstadoNuevo = mensajesPorEstado[estadoNuevo] || estadoNuevo.toLowerCase();

    Alert.alert(
      '¿Confirmar cambio de estado?',
      `¿Estás seguro de cambiar de "${estadoActual}" a "${textoEstadoNuevo}"?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => {
            setCargando(false);
          }
        },
        {
          text: 'Confirmar',
          onPress: async () => {
            setCargando(true);
            try {
              await onConfirmar();
            } finally {
              setCargando(false);
            }
          },
          style: 'default'
        }
      ],
      { cancelable: false }
    );
  };

  return {
    confirmarCambioEstado,
    cargando,
  };
};
```

---

### 3. Manejo de Errores de Restricción

**Archivo**: `utils/estadoErrorHandler.js`

```javascript
import { Alert } from 'react-native';

/**
 * Maneja errores específicos de cambios de estado
 */
export const manejarErrorCambioEstado = (error) => {
  const mensaje = error.response?.data?.message || 'Error al cambiar estado';

  // Error específico: Restricción VIAJANDO → FRANCO/LICENCIA_ANUAL
  if (mensaje.includes('VIAJANDO') &&
      (mensaje.includes('FRANCO') || mensaje.includes('LICENCIA_ANUAL'))) {

    Alert.alert(
      'Cambio no permitido',
      'No puedes tomar franco o licencia mientras estás viajando.\n\n' +
      'Debes completar el viaje primero:\n' +
      '1. Pasar a DESCANSANDO para registrar tu descanso\n' +
      '2. Volver a VIAJANDO después del descanso\n' +
      '3. Cambiar a DESCARGANDO al llegar\n' +
      '4. Finalizar la entrega\n' +
      '5. Volver a DISPONIBLE\n' +
      '6. Ahí podrás pedir franco o licencia',
      [{ text: 'Entendido', style: 'default' }]
    );

    return;
  }

  // Error de confirmación faltante (no debería ocurrir si usamos el hook)
  if (mensaje.includes('confirmación')) {
    Alert.alert(
      'Error de confirmación',
      'Se requiere confirmación para cambiar de estado. Por favor, intenta nuevamente.',
      [{ text: 'OK' }]
    );
    return;
  }

  // Otros errores de validación de estado
  Alert.alert(
    'Error al cambiar estado',
    mensaje,
    [{ text: 'OK' }]
  );
};
```

---

### 4. Componente de Ejemplo: Cambio de Estado

**Archivo**: `screens/ChoferEstadoScreen.js`

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useConfirmacionEstado } from '../hooks/useConfirmacionEstado';
import { cambiarEstadoChofer } from '../services/choferService';
import { manejarErrorCambioEstado } from '../utils/estadoErrorHandler';

const ChoferEstadoScreen = ({ chofer, onEstadoActualizado }) => {
  const { confirmarCambioEstado, cargando } = useConfirmacionEstado();

  /**
   * Maneja el cambio de estado con confirmación
   */
  const handleCambiarEstado = (nuevoEstado, datosAdicionales = {}) => {
    confirmarCambioEstado(
      chofer.estado_chofer,
      nuevoEstado,
      async () => {
        try {
          const resultado = await cambiarEstadoChofer(chofer.id_chofer, {
            estado_chofer: nuevoEstado,
            ...datosAdicionales,
          });

          // Notificar éxito
          Alert.alert(
            'Estado actualizado',
            `Tu estado cambió a: ${nuevoEstado}`,
            [{ text: 'OK' }]
          );

          // Actualizar la UI
          onEstadoActualizado(resultado.chofer);

        } catch (error) {
          manejarErrorCambioEstado(error);
        }
      }
    );
  };

  /**
   * Renderiza botones según el estado actual
   */
  const renderBotones = () => {
    switch (chofer.estado_chofer) {
      case 'DISPONIBLE':
        return (
          <>
            <BotonEstado
              titulo="Tomar Franco"
              onPress={() => handleCambiarEstado('FRANCO', {
                fecha_inicio_licencia: new Date().toISOString(),
                razon_estado: 'Franco solicitado',
              })}
            />
            <BotonEstado
              titulo="Solicitar Licencia"
              onPress={() => handleCambiarEstado('LICENCIA_ANUAL', {
                fecha_inicio_licencia: new Date().toISOString(),
                razon_estado: 'Licencia solicitada',
              })}
            />
          </>
        );

      case 'CARGANDO':
        return (
          <BotonEstado
            titulo="Iniciar Viaje"
            onPress={() => handleCambiarEstado('VIAJANDO')}
          />
        );

      case 'VIAJANDO':
        return (
          <>
            <BotonEstado
              titulo="Marcar Descanso"
              onPress={() => handleCambiarEstado('DESCANSANDO')}
            />
            {/* NO mostrar opciones de FRANCO o LICENCIA aquí - están bloqueadas */}
          </>
        );

      case 'DESCANSANDO':
        return (
          <BotonEstado
            titulo="Continuar Viaje"
            onPress={() => handleCambiarEstado('VIAJANDO')}
          />
        );

      case 'DESCARGANDO':
        return (
          <BotonEstado
            titulo="Finalizar Entrega"
            onPress={() => {
              // Aquí deberías pedir las toneladas descargadas primero
              handleCambiarEstado('ENTREGA_FINALIZADA', {
                toneladas_descargadas: 50, // Obtener del input del usuario
              });
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.estadoActual}>
        Estado actual: {chofer.estado_chofer}
      </Text>

      {cargando ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        renderBotones()
      )}
    </View>
  );
};

/**
 * Componente de botón reutilizable
 */
const BotonEstado = ({ titulo, onPress, disabled }) => (
  <TouchableOpacity
    style={[styles.boton, disabled && styles.botonDeshabilitado]}
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={styles.botonTexto}>{titulo}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  estadoActual: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  boton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  botonDeshabilitado: {
    backgroundColor: '#ccc',
  },
  botonTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChoferEstadoScreen;
```

---

### 5. Ejemplo Completo de Cambio con Fechas

**Para estados que requieren fechas (FRANCO, LICENCIA_ANUAL):**

```javascript
import DateTimePicker from '@react-native-community/datetimepicker';

const SolicitarFrancoScreen = ({ chofer }) => {
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [fechaFin, setFechaFin] = useState(null);
  const [razon, setRazon] = useState('');
  const { confirmarCambioEstado, cargando } = useConfirmacionEstado();

  const handleSolicitar = () => {
    confirmarCambioEstado(
      chofer.estado_chofer,
      'FRANCO',
      async () => {
        try {
          await cambiarEstadoChofer(chofer.id_chofer, {
            estado_chofer: 'FRANCO',
            fecha_inicio_licencia: fechaInicio.toISOString(),
            fecha_fin_licencia: fechaFin?.toISOString(),
            razon_estado: razon,
          });

          Alert.alert('Éxito', 'Franco solicitado correctamente');
          navigation.goBack();

        } catch (error) {
          manejarErrorCambioEstado(error);
        }
      }
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Fecha de inicio:</Text>
      <DateTimePicker
        value={fechaInicio}
        mode="date"
        onChange={(event, date) => setFechaInicio(date)}
      />

      <Text style={styles.label}>Fecha de fin (opcional):</Text>
      <DateTimePicker
        value={fechaFin || new Date()}
        mode="date"
        onChange={(event, date) => setFechaFin(date)}
      />

      <TextInput
        style={styles.input}
        placeholder="Razón (opcional)"
        value={razon}
        onChangeText={setRazon}
      />

      <TouchableOpacity
        style={styles.boton}
        onPress={handleSolicitar}
        disabled={cargando}
      >
        <Text style={styles.botonTexto}>
          {cargando ? 'Solicitando...' : 'Solicitar Franco'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
```

---

## 🚦 Validaciones en el Frontend

### Validación 1: No mostrar opciones bloqueadas

```javascript
/**
 * Verifica si un estado está permitido desde el estado actual
 */
const esTransicionPermitida = (estadoActual, estadoNuevo) => {
  // Restricción especial: VIAJANDO → FRANCO/LICENCIA_ANUAL
  if (estadoActual === 'VIAJANDO' &&
      (estadoNuevo === 'FRANCO' || estadoNuevo === 'LICENCIA_ANUAL')) {
    return false;
  }

  // Aquí puedes agregar más validaciones del frontend
  // para mejorar la UX antes de que el backend rechace

  return true;
};

// Uso en la UI:
{esTransicionPermitida(chofer.estado_chofer, 'FRANCO') && (
  <BotonEstado
    titulo="Tomar Franco"
    onPress={() => handleCambiarEstado('FRANCO', {...})}
  />
)}
```

### Validación 2: Mensaje preventivo

```javascript
const intentarCambiarAFranco = () => {
  if (chofer.estado_chofer === 'VIAJANDO') {
    Alert.alert(
      'No disponible durante el viaje',
      'Debes completar el viaje antes de tomar franco.\n\n' +
      '¿Deseas ver el flujo correcto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ver flujo',
          onPress: () => mostrarFlujoViaje(),
        }
      ]
    );
    return;
  }

  // Si no está viajando, proceder normalmente
  handleCambiarEstado('FRANCO', {...});
};
```

---

## 📊 Resumen de Cambios Necesarios

### ✅ Checklist de Implementación

#### Servicios
- [ ] Modificar `cambiarEstadoChofer()` para incluir siempre `confirmado: true`
- [ ] Agregar función `manejarErrorCambioEstado()` para errores específicos

#### Hooks
- [ ] Crear `useConfirmacionEstado()` para diálogos de confirmación

#### Componentes
- [ ] Actualizar todos los componentes que cambian estado para usar confirmación
- [ ] Ocultar botones de FRANCO/LICENCIA cuando estado sea VIAJANDO
- [ ] Agregar mensajes explicativos cuando una transición esté bloqueada

#### Validaciones
- [ ] Agregar validación `esTransicionPermitida()` en el frontend
- [ ] Mostrar mensajes descriptivos del flujo correcto

#### Testing
- [ ] Probar cambio de estado con confirmación
- [ ] Probar intento de VIAJANDO → FRANCO (debe mostrar error)
- [ ] Probar intento de VIAJANDO → LICENCIA_ANUAL (debe mostrar error)
- [ ] Probar flujo completo VIAJANDO → DESCANSANDO → ... → DISPONIBLE → FRANCO

---

## 🎯 Mensajes de Error para Manejar

### Error 1: Falta confirmación
```json
{
  "statusCode": 400,
  "message": "Se requiere confirmación para cambiar de estado. Debes confirmar explícitamente este cambio.",
  "error": "Bad Request"
}
```
**Acción**: Mostrar diálogo de confirmación (no debería ocurrir si implementas el hook)

### Error 2: Restricción VIAJANDO → FRANCO/LICENCIA_ANUAL
```json
{
  "statusCode": 400,
  "message": "No puedes cambiar de VIAJANDO a FRANCO o LICENCIA_ANUAL. Debes completar el viaje primero (pasar por DESCANSANDO → DESCARGANDO → ENTREGA_FINALIZADA → DISPONIBLE).",
  "error": "Bad Request"
}
```
**Acción**: Mostrar explicación del flujo correcto con pasos numerados

---

## 📱 UX Recomendada

### Flujo Ideal

1. **Usuario presiona botón "Cambiar Estado"**
   - Se muestra diálogo: "¿Confirmar cambio de DISPONIBLE a FRANCO?"

2. **Usuario confirma**
   - Se envía petición con `confirmado: true`
   - Se muestra loading indicator

3. **Si es exitoso**
   - Alert: "Estado actualizado a FRANCO"
   - Actualizar UI con nuevo estado

4. **Si hay error de restricción**
   - Alert con mensaje descriptivo del flujo correcto
   - Opción "Ver flujo completo" que muestra diagrama

5. **Si hay otro error**
   - Alert con mensaje de error genérico
   - Opción "Reintentar"

---

## 🌐 Configuración de Conexión

**IP Actual del Backend**: `http://192.168.0.146:3000/api/v1`

```javascript
// config/api.js
export const API_URL = 'http://192.168.0.146:3000/api/v1';
```

---

## 📞 Endpoints Relevantes

### PATCH /api/v1/choferes/:id_chofer/estado

**Body obligatorio:**
```json
{
  "estado_chofer": "FRANCO",
  "confirmado": true,  // ← SIEMPRE REQUERIDO
  "fecha_inicio_licencia": "2026-01-15T00:00:00.000Z",  // ← Para FRANCO, LICENCIA_ANUAL
  "razon_estado": "Texto opcional"
}
```

---

**Prompt completado** ✅
**Fecha**: 11 de enero de 2026
**Listo para implementar en el frontend**