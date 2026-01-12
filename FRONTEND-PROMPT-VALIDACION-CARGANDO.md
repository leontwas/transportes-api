# Prompt para Frontend: Validación DISPONIBLE → CARGANDO

**Fecha**: 10 de enero de 2026
**Tipo**: Cambio de validación - Requiere actualización del frontend

---

## 🎯 Objetivo

Actualizar la interfaz del frontend (app móvil de choferes) para reflejar la nueva validación del backend que **impide que un chofer cambie a estado CARGANDO sin tener un viaje asignado**.

---

## 📋 Cambio Realizado en el Backend

Se implementó una validación en el backend que verifica que el chofer tenga un viaje asignado antes de permitir el cambio de estado a CARGANDO.

### Comportamiento Actual del Backend

**Cuando un chofer DISPONIBLE intenta cambiar a CARGANDO:**

✅ **CON viaje asignado:**
- Permite el cambio de estado
- Actualiza chofer → `cargando`
- Actualiza viaje → `cargando`
- Actualiza recursos (tractor → `ocupado`, batea → `cargado`)
- Retorna 200 OK

❌ **SIN viaje asignado:**
- Rechaza el cambio de estado
- Retorna 400 Bad Request
- Mensaje: `"No puedes cambiar a CARGANDO sin tener un viaje asignado. El administrador debe asignarte un viaje primero."`

---

## 🔄 Cambios Requeridos en el Frontend

### 1. Verificar si el Chofer Tiene Viaje Asignado

Antes de mostrar la UI de cambio de estado, el frontend debe:

1. **Obtener la información completa del chofer:**
   ```http
   GET /api/v1/choferes/{id_chofer}
   ```

2. **Obtener los viajes del chofer:**
   ```http
   GET /api/v1/viajes?chofer_id={id_chofer}
   ```

3. **Filtrar viajes activos (no finalizados):**
   ```javascript
   const viajesActivos = viajes.filter(v => v.estado_viaje !== 'finalizado');
   const tieneViajeAsignado = viajesActivos.length > 0;
   ```

### 2. Actualizar la UI del Botón "CARGANDO"

#### Opción A: Deshabilitar el Botón (Recomendado)

Cuando el chofer está DISPONIBLE pero NO tiene viaje asignado:

```jsx
<Button
  disabled={chofer.estado_chofer === 'disponible' && !tieneViajeAsignado}
  onPress={() => cambiarEstado('cargando')}
>
  CARGANDO
</Button>

{chofer.estado_chofer === 'disponible' && !tieneViajeAsignado && (
  <Text style={styles.warningText}>
    ⚠️ Debes esperar a que el administrador te asigne un viaje
  </Text>
)}
```

**Ventajas:**
- Previene el error antes de que ocurra
- UX más clara - el usuario sabe que no puede realizar la acción
- No requiere manejo de error 400

#### Opción B: Mostrar Alerta al Presionar (Alternativa)

Si prefieres permitir que el usuario presione y mostrar un mensaje:

```jsx
const handleCambiarACargando = async () => {
  if (chofer.estado_chofer === 'disponible' && !tieneViajeAsignado) {
    Alert.alert(
      'Viaje no asignado',
      'No puedes cambiar a CARGANDO sin tener un viaje asignado. Contacta al administrador.',
      [{ text: 'OK' }]
    );
    return;
  }

  try {
    await cambiarEstado('cargando');
  } catch (error) {
    // Manejo de errores del backend
  }
};
```

**Ventajas:**
- Permite mostrar un mensaje más detallado
- Puede incluir botón para contactar al admin
- Mantiene consistencia con otros flujos de error

### 3. Manejo de Errores del Backend

Independientemente de la opción elegida, debes manejar el error 400 del backend:

```javascript
const cambiarEstado = async (nuevoEstado) => {
  try {
    const response = await axios.patch(
      `${API_URL}/choferes/${choferId}/estado`,
      { estado_chofer: nuevoEstado },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Actualizar el estado local
    setChofer(response.data);

    // Mostrar confirmación
    Alert.alert('Éxito', `Estado cambiado a ${nuevoEstado}`);

  } catch (error) {
    if (error.response?.status === 400) {
      // Error de validación del backend
      Alert.alert(
        'No se puede cambiar de estado',
        error.response.data.message,
        [{ text: 'OK' }]
      );
    } else {
      // Otro tipo de error
      Alert.alert(
        'Error',
        'Ocurrió un error al cambiar el estado. Intenta nuevamente.',
        [{ text: 'OK' }]
      );
    }
  }
};
```

### 4. Actualizar el Estado de la Vista Automáticamente

Cuando el administrador asigna un viaje:

```javascript
// Opción 1: Polling cada 30 segundos (simple)
useEffect(() => {
  const interval = setInterval(async () => {
    const viajes = await obtenerViajes(choferId);
    const viajesActivos = viajes.filter(v => v.estado_viaje !== 'finalizado');
    setTieneViajeAsignado(viajesActivos.length > 0);
  }, 30000);

  return () => clearInterval(interval);
}, [choferId]);

// Opción 2: WebSockets / Push Notifications (avanzado)
// Implementar notificación push cuando se asigna un viaje
```

### 5. Mostrar Información del Viaje Asignado

Si el chofer tiene viaje asignado, mostrar la información del viaje:

```jsx
{tieneViajeAsignado && viajeActual && (
  <View style={styles.viajeInfo}>
    <Text style={styles.viajeTitle}>📦 Viaje Asignado</Text>
    <Text>📍 Origen: {viajeActual.origen}</Text>
    <Text>📍 Destino: {viajeActual.destino}</Text>
    <Text>⚖️  Toneladas: {viajeActual.toneladas_cargadas}</Text>
    <Text>📋 Estado: {viajeActual.estado_viaje}</Text>
  </View>
)}
```

---

## 📱 Implementación Paso a Paso

### Paso 1: Crear Hook para Verificar Viaje Asignado

```javascript
// hooks/useViajeAsignado.js
import { useState, useEffect } from 'react';
import { obtenerViajesChofer } from '../services/viajesService';

export const useViajeAsignado = (choferId) => {
  const [tieneViaje, setTieneViaje] = useState(false);
  const [viajeActual, setViajeActual] = useState(null);
  const [loading, setLoading] = useState(true);

  const verificarViaje = async () => {
    try {
      const viajes = await obtenerViajesChofer(choferId);
      const viajesActivos = viajes.filter(v => v.estado_viaje !== 'finalizado');

      if (viajesActivos.length > 0) {
        setTieneViaje(true);
        setViajeActual(viajesActivos[0]); // Tomar el primero
      } else {
        setTieneViaje(false);
        setViajeActual(null);
      }
    } catch (error) {
      console.error('Error verificando viaje:', error);
      setTieneViaje(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (choferId) {
      verificarViaje();
    }
  }, [choferId]);

  return { tieneViaje, viajeActual, loading, refetch: verificarViaje };
};
```

### Paso 2: Actualizar el Componente de Cambio de Estado

```javascript
// components/CambioEstadoScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useViajeAsignado } from '../hooks/useViajeAsignado';
import { cambiarEstadoChofer } from '../services/choferesService';

const CambioEstadoScreen = ({ chofer, onEstadoCambiado }) => {
  const { tieneViaje, viajeActual, loading, refetch } = useViajeAsignado(chofer.id_chofer);

  const handleCambiarEstado = async (nuevoEstado) => {
    // Validación especial para CARGANDO
    if (nuevoEstado === 'cargando' && chofer.estado_chofer === 'disponible') {
      if (!tieneViaje) {
        Alert.alert(
          'Viaje no asignado',
          'No puedes cambiar a CARGANDO sin tener un viaje asignado.\n\nEspera a que el administrador te asigne un viaje.',
          [
            { text: 'Actualizar', onPress: refetch },
            { text: 'OK', style: 'cancel' }
          ]
        );
        return;
      }
    }

    try {
      const resultado = await cambiarEstadoChofer(chofer.id_chofer, nuevoEstado);
      Alert.alert('Éxito', `Estado cambiado a ${nuevoEstado.toUpperCase()}`);
      onEstadoCambiado(resultado);

    } catch (error) {
      if (error.response?.status === 400) {
        Alert.alert('Validación', error.response.data.message);
      } else {
        Alert.alert('Error', 'No se pudo cambiar el estado. Intenta nuevamente.');
      }
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#0066cc" />;
  }

  return (
    <View style={styles.container}>
      {/* Información del estado actual */}
      <Text style={styles.estadoActual}>
        Estado Actual: {chofer.estado_chofer.toUpperCase()}
      </Text>

      {/* Información del viaje si está asignado */}
      {tieneViaje && viajeActual && (
        <View style={styles.viajeCard}>
          <Text style={styles.viajeTitle}>📦 Viaje Asignado</Text>
          <Text>📍 {viajeActual.origen} → {viajeActual.destino}</Text>
          <Text>⚖️  {viajeActual.toneladas_cargadas} toneladas</Text>
        </View>
      )}

      {/* Botones de cambio de estado */}
      {chofer.estado_chofer === 'disponible' && (
        <View style={styles.botonesContainer}>
          <TouchableOpacity
            style={[
              styles.boton,
              !tieneViaje && styles.botonDeshabilitado
            ]}
            onPress={() => handleCambiarEstado('cargando')}
            disabled={!tieneViaje}
          >
            <Text style={styles.botonTexto}>CARGANDO</Text>
          </TouchableOpacity>

          {!tieneViaje && (
            <Text style={styles.advertencia}>
              ⚠️ Esperando asignación de viaje
            </Text>
          )}
        </View>
      )}

      {/* Otros botones de estado... */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  estadoActual: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  viajeCard: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  viajeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  botonesContainer: {
    marginTop: 20,
  },
  boton: {
    backgroundColor: '#4caf50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  botonDeshabilitado: {
    backgroundColor: '#cccccc',
  },
  botonTexto: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  advertencia: {
    color: '#ff9800',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 5,
  },
});

export default CambioEstadoScreen;
```

### Paso 3: Servicio para Obtener Viajes

```javascript
// services/viajesService.js
import axios from 'axios';
import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const obtenerViajesChofer = async (choferId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const response = await axios.get(
      `${API_URL}/viajes?chofer_id=${choferId}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error obteniendo viajes:', error);
    throw error;
  }
};
```

---

## 🌐 Configuración de Conexión

### IP Actual del Backend

**IMPORTANTE**: La URL del backend para desarrollo en red local es:

```javascript
// config/api.js o .env
export const API_URL = 'http://192.168.0.146:3000/api/v1';

// O en .env
API_URL=http://192.168.0.146:3000/api/v1
```

**Requisitos:**
- El celular debe estar conectado a la misma red Wi-Fi que la PC del backend
- IP actual del servidor: `192.168.0.146`
- Puerto: `3000`

**Verificación rápida:**
Desde el navegador del celular, accede a:
```
http://192.168.0.146:3000/api/v1/choferes
```

Debes ver un error de autenticación (esto confirma que la conexión funciona).

Para más detalles sobre la configuración de red, consulta: [CONEXION-ACTUAL.md](./CONEXION-ACTUAL.md)

---

## 🎨 Diseño UI Recomendado

### Cuando NO tiene viaje asignado:

```
┌─────────────────────────────────────┐
│ Estado Actual: DISPONIBLE           │
├─────────────────────────────────────┤
│                                     │
│  ⚠️ Esperando asignación de viaje   │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  CARGANDO  (Deshabilitado)    │ │
│  └───────────────────────────────┘ │
│                                     │
│  Debes esperar a que el adminis-   │
│  trador te asigne un viaje para    │
│  poder cambiar a CARGANDO.         │
│                                     │
└─────────────────────────────────────┘
```

### Cuando tiene viaje asignado:

```
┌─────────────────────────────────────┐
│ Estado Actual: DISPONIBLE           │
├─────────────────────────────────────┤
│  📦 Viaje Asignado                  │
│  ├ 📍 San Nicolas → Rosario         │
│  ├ ⚖️  30 toneladas                 │
│  └ 📋 Estado: pendiente             │
│                                     │
│  ┌───────────────────────────────┐ │
│  │     CARGANDO ✓                │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

---

## ✅ Checklist de Implementación

### Backend (✅ Completado)
- [x] Validación de viaje asignado implementada
- [x] Tests de validación pasando
- [x] Documentación actualizada

### Frontend (📝 Por Implementar)
- [ ] Crear hook `useViajeAsignado` para verificar viaje
- [ ] Actualizar componente de cambio de estado
- [ ] Deshabilitar botón CARGANDO cuando no hay viaje
- [ ] Mostrar mensaje informativo
- [ ] Manejar error 400 del backend
- [ ] Mostrar información del viaje asignado
- [ ] Implementar botón "Actualizar" para refrescar estado
- [ ] Testing de flujo completo
- [ ] Testing de manejo de errores

---

## 🧪 Casos de Prueba Frontend

### Test 1: Chofer sin viaje asignado
1. Login como chofer en estado DISPONIBLE sin viaje
2. Verificar que botón CARGANDO está deshabilitado
3. Verificar que se muestra mensaje de advertencia
4. Intentar presionar botón → No debe permitir

### Test 2: Chofer con viaje asignado
1. Admin asigna viaje al chofer
2. Chofer actualiza la vista (pull to refresh)
3. Verificar que botón CARGANDO está habilitado
4. Verificar que se muestra información del viaje
5. Presionar CARGANDO → Debe cambiar estado exitosamente

### Test 3: Manejo de error del backend
1. Forzar cambio a CARGANDO sin viaje (bypass frontend)
2. Verificar que se muestra mensaje de error del backend
3. Verificar que el estado NO cambia en la UI

---

## 📞 Soporte

Si tienes dudas sobre la implementación, revisa:
- [IMPLEMENTACION-VALIDACION-CARGANDO.md](./IMPLEMENTACION-VALIDACION-CARGANDO.md) - Documentación técnica del backend
- [test-validacion-cargando.js](./test-validacion-cargando.js) - Tests del backend

---

**Prompt creado el**: 10 de enero de 2026
**Backend implementado**: ✅ Sí
**Frontend pendiente**: ⏳ Sí