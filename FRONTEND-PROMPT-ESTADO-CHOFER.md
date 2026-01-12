# Frontend Prompt: Pantalla de Estado del Chofer

## Contexto
Este prompt te ayudará a implementar la pantalla de "Estado" para usuarios con rol CHOFER en la aplicación React Native. Esta pantalla permite a los choferes actualizar su estado en tiempo real con el servidor.

## Requisitos del Backend Implementados

### 1. Roles de Usuario
- **ADMIN**: Acceso completo a gestionar, asignar viajes y ver informes
- **CHOFER**: Solo puede actualizar su propio estado

### 2. Endpoint Disponible
```
PATCH /api/v1/choferes/mi-estado
Headers: Authorization: Bearer {token}
Body: {
  "estado_chofer": "cargando" | "descargando" | "viajando" | "descansando" | "licencia_anual" | "licencia_medica" | "licencia_art" | "activo" | "inactivo",
  "razon_estado": "Opcional: razón del estado"
}

Response: {
  "id_chofer": number,
  "nombre_completo": string,
  "estado_chofer": string,
  "razon_estado": string | null,
  "tractor": {...},
  "batea": {...}
}
```

### 3. Estados Disponibles del Chofer
```typescript
enum EstadoChofer {
  CARGANDO = 'cargando',
  DESCARGANDO = 'descargando',
  VIAJANDO = 'viajando',
  DESCANSANDO = 'descansando',
  LICENCIA_ANUAL = 'licencia_anual',
  LICENCIA_MEDICA = 'licencia_medica',
  LICENCIA_ART = 'licencia_art',
  ACTIVO = 'activo',
  INACTIVO = 'inactivo',
}
```

## Implementación del Frontend

### 1. Crear Type Definitions (opcional pero recomendado)

Crea `types/chofer.types.ts`:
```typescript
export enum EstadoChofer {
  CARGANDO = 'cargando',
  DESCARGANDO = 'descargando',
  VIAJANDO = 'viajando',
  DESCANSANDO = 'descansando',
  LICENCIA_ANUAL = 'licencia_anual',
  LICENCIA_MEDICA = 'licencia_medica',
  LICENCIA_ART = 'licencia_art',
  ACTIVO = 'activo',
  INACTIVO = 'inactivo',
}

export interface EstadoConfig {
  label: string;
  emoji: string;
  color: string;
  backgroundColor: string;
  requiresReason?: boolean;
}
```

### 2. Crear Pantalla de Estado del Chofer

Crea `screens/ChoferEstadoScreen.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import apiClient from '../api/apiClient';
import { EstadoChofer } from '../types/chofer.types';

// Configuración de colores y emojis para cada estado
const ESTADOS_CONFIG: Record<EstadoChofer, EstadoConfig> = {
  [EstadoChofer.CARGANDO]: {
    label: 'Cargando',
    emoji: '📦',
    color: '#fff',
    backgroundColor: '#FF9800',
  },
  [EstadoChofer.DESCARGANDO]: {
    label: 'Descargando',
    emoji: '📤',
    color: '#fff',
    backgroundColor: '#FF5722',
  },
  [EstadoChofer.VIAJANDO]: {
    label: 'Viajando',
    emoji: '🚛',
    color: '#fff',
    backgroundColor: '#2196F3',
  },
  [EstadoChofer.DESCANSANDO]: {
    label: 'Descansando',
    emoji: '😴',
    color: '#fff',
    backgroundColor: '#9C27B0',
  },
  [EstadoChofer.LICENCIA_ANUAL]: {
    label: 'Licencia Anual',
    emoji: '🏖️',
    color: '#fff',
    backgroundColor: '#00BCD4',
    requiresReason: true,
  },
  [EstadoChofer.LICENCIA_MEDICA]: {
    label: 'Licencia Médica',
    emoji: '🏥',
    color: '#fff',
    backgroundColor: '#E91E63',
    requiresReason: true,
  },
  [EstadoChofer.LICENCIA_ART]: {
    label: 'Licencia ART',
    emoji: '⚕️',
    color: '#fff',
    backgroundColor: '#F44336',
    requiresReason: true,
  },
  [EstadoChofer.ACTIVO]: {
    label: 'Activo',
    emoji: '✅',
    color: '#fff',
    backgroundColor: '#4CAF50',
  },
  [EstadoChofer.INACTIVO]: {
    label: 'Inactivo',
    emoji: '❌',
    color: '#fff',
    backgroundColor: '#9E9E9E',
  },
};

export const ChoferEstadoScreen = () => {
  const [estadoActual, setEstadoActual] = useState<EstadoChofer | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [razonEstado, setRazonEstado] = useState('');
  const [selectedEstado, setSelectedEstado] = useState<EstadoChofer | null>(null);

  useEffect(() => {
    cargarEstadoActual();
  }, []);

  const cargarEstadoActual = async () => {
    try {
      setLoading(true);
      // Asume que el endpoint /auth/me retorna también el chofer asociado
      const response = await apiClient.get('/api/v1/auth/me');

      if (response.data.chofer_id) {
        const choferResponse = await apiClient.get(`/api/v1/choferes/${response.data.chofer_id}`);
        setEstadoActual(choferResponse.data.estado_chofer);
      }
    } catch (error) {
      console.error('Error al cargar estado:', error);
      Alert.alert('Error', 'No se pudo cargar el estado actual');
    } finally {
      setLoading(false);
    }
  };

  const handleEstadoPress = (estado: EstadoChofer) => {
    const config = ESTADOS_CONFIG[estado];

    if (estado === estadoActual) {
      Alert.alert('Información', 'Ya tienes este estado activo');
      return;
    }

    if (config.requiresReason) {
      setSelectedEstado(estado);
      setShowReasonModal(true);
    } else {
      actualizarEstado(estado);
    }
  };

  const actualizarEstado = async (estado: EstadoChofer, razon?: string) => {
    try {
      setUpdating(true);

      await apiClient.patch('/api/v1/choferes/mi-estado', {
        estado_chofer: estado,
        razon_estado: razon || undefined,
      });

      setEstadoActual(estado);
      Alert.alert(
        'Estado Actualizado',
        `Tu estado se cambió a: ${ESTADOS_CONFIG[estado].label}`,
      );

      setShowReasonModal(false);
      setRazonEstado('');
      setSelectedEstado(null);
    } catch (error: any) {
      console.error('Error al actualizar estado:', error);
      const errorMessage =
        error.response?.data?.message || 'No se pudo actualizar el estado';
      Alert.alert('Error', errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmReason = () => {
    if (!razonEstado.trim()) {
      Alert.alert('Atención', 'Por favor ingresa una razón para este estado');
      return;
    }

    if (selectedEstado) {
      actualizarEstado(selectedEstado, razonEstado.trim());
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando estado...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🚛</Text>
        <Text style={styles.headerTitle}>Mi Estado</Text>
        <Text style={styles.headerSubtitle}>
          Actualiza tu estado en tiempo real
        </Text>
      </View>

      {estadoActual && (
        <View style={styles.currentStateContainer}>
          <Text style={styles.currentStateLabel}>Estado Actual:</Text>
          <View
            style={[
              styles.currentStateBadge,
              { backgroundColor: ESTADOS_CONFIG[estadoActual].backgroundColor },
            ]}
          >
            <Text style={styles.currentStateEmoji}>
              {ESTADOS_CONFIG[estadoActual].emoji}
            </Text>
            <Text style={styles.currentStateText}>
              {ESTADOS_CONFIG[estadoActual].label}
            </Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Cambiar Estado:</Text>

      <View style={styles.gridContainer}>
        {(Object.keys(ESTADOS_CONFIG) as EstadoChofer[]).map((estado) => {
          const config = ESTADOS_CONFIG[estado];
          const isActive = estado === estadoActual;

          return (
            <TouchableOpacity
              key={estado}
              style={[
                styles.estadoButton,
                { backgroundColor: config.backgroundColor },
                isActive && styles.estadoButtonActive,
              ]}
              onPress={() => handleEstadoPress(estado)}
              disabled={updating}
            >
              <Text style={styles.estadoEmoji}>{config.emoji}</Text>
              <Text style={[styles.estadoLabel, { color: config.color }]}>
                {config.label}
              </Text>
              {isActive && <Text style={styles.activeIndicator}>●</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Modal para ingresar razón */}
      <Modal
        visible={showReasonModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReasonModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Razón del Estado</Text>
            <Text style={styles.modalSubtitle}>
              {selectedEstado && ESTADOS_CONFIG[selectedEstado].label}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Ingresa la razón..."
              value={razonEstado}
              onChangeText={setRazonEstado}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowReasonModal(false);
                  setRazonEstado('');
                  setSelectedEstado(null);
                }}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleConfirmReason}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={[styles.modalButtonText, styles.modalButtonTextConfirm]}
                  >
                    Confirmar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerEmoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  currentStateContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentStateLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  currentStateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  currentStateEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  currentStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  estadoButton: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  estadoButtonActive: {
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  estadoEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  estadoLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 20,
    color: '#FFD700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#333',
    minHeight: 100,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  modalButtonCancel: {
    backgroundColor: '#f0f0f0',
  },
  modalButtonConfirm: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modalButtonTextConfirm: {
    color: '#fff',
  },
});
```

### 3. Actualizar Navegación

#### Opción A: Si usas React Navigation con roles

Actualiza tu `navigation/AppNavigator.tsx` para mostrar diferentes pantallas según el rol:

```typescript
import { ChoferEstadoScreen } from '../screens/ChoferEstadoScreen';

// Dentro de tu Stack.Navigator o Tab.Navigator
{user.rol === 'chofer' ? (
  <>
    <Tab.Screen
      name="Estado"
      component={ChoferEstadoScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Text style={{ fontSize: size }}>🚛</Text>
        ),
      }}
    />
  </>
) : (
  <>
    <Tab.Screen name="Gestionar" component={GestionarScreen} />
    <Tab.Screen name="AsignarViajes" component={AsignarViajesScreen} />
    <Tab.Screen name="Informes" component={InformesScreen} />
  </>
)}
```

#### Opción B: NavBar Condicional

Si tienes un NavBar custom, actualízalo para mostrar solo "Estado" para choferes:

```typescript
const NavLinks = () => {
  const { user } = useAuth();

  if (user.rol === 'chofer') {
    return (
      <NavLink to="/estado" icon="🚛" label="Estado" />
    );
  }

  return (
    <>
      <NavLink to="/gestionar" icon="⚙️" label="Gestionar" />
      <NavLink to="/asignar-viajes" icon="📋" label="Asignar Viajes" />
      <NavLink to="/informes" icon="📊" label="Informes" />
    </>
  );
};
```

### 4. Actualizar Context de Auth

Asegúrate de que tu `AuthContext` guarde el rol y chofer_id:

```typescript
// auth/AuthContext.tsx
const login = async (token: string) => {
  await AsyncStorage.setItem('token', token);

  // Obtener info del usuario
  const response = await apiClient.get('/api/v1/auth/me');
  setUser(response.data);
};
```

### 5. Consideraciones de UX

1. **Feedback Visual**: Los estados tienen colores distintivos para fácil identificación
2. **Validación**: Estados que requieren razón muestran un modal
3. **Estado Actual**: Se muestra claramente con un badge dorado
4. **Loading States**: Indicadores de carga durante actualizaciones
5. **Confirmaciones**: Alert después de cambiar el estado

### 6. Testing

Para probar la funcionalidad:

1. Crea un usuario chofer en el backend:
```bash
node scripts/create-chofer-user.js
```

2. Loguéate con las credenciales del chofer
3. Verifica que solo veas la pantalla "Estado"
4. Prueba cambiar entre diferentes estados
5. Verifica que los estados con razón requerida muestren el modal

## Resumen

Este prompt te proporciona una implementación completa y visualmente atractiva de la pantalla de estado para choferes, con:
- ✅ 9 estados diferentes con emojis y colores únicos
- ✅ Validación de estados que requieren razón
- ✅ UI responsive con grid de botones
- ✅ Modal para ingresar razones
- ✅ Indicador visual del estado actual
- ✅ Integración completa con el backend
- ✅ Manejo de errores y estados de carga
