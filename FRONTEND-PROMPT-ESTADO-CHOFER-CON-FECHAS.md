# Frontend Prompt: Pantalla de Estado del Chofer con Gestión de Fechas de Licencia

## Contexto
Esta es la versión actualizada de la pantalla de "Estado" para usuarios con rol CHOFER. Ahora incluye la gestión de fechas para los estados de licencia (Anual, Médica, ART).

## Cambios Respecto a la Versión Anterior

### Backend Actualizado
El endpoint `/api/v1/choferes/mi-estado` ahora acepta campos adicionales para licencias:
- `fecha_inicio_licencia`: **OBLIGATORIO** para licencias
- `fecha_fin_licencia`: **OPCIONAL** para licencias (puede ser `null` si duración desconocida)

## Endpoint API

```
PATCH /api/v1/choferes/mi-estado
Headers: Authorization: Bearer {token}

// Para estados de LICENCIA:
Body: {
  "estado_chofer": "licencia_anual" | "licencia_medica" | "licencia_art",
  "fecha_inicio_licencia": "2026-01-07T00:00:00.000Z",
  "fecha_fin_licencia": "2026-01-15T00:00:00.000Z" | null
}

// Para OTROS estados:
Body: {
  "estado_chofer": "cargando" | "descargando" | "viajando" | "descansando" | "activo" | "inactivo"
}

Response: {
  "id_chofer": 1,
  "nombre_completo": "Carlos Andrada",
  "estado_chofer": "licencia_anual",
  "fecha_inicio_licencia": "2026-01-07T00:00:00.000Z",
  "fecha_fin_licencia": "2026-01-15T00:00:00.000Z",
  "tractor": {...},
  "batea": {...}
}
```

## Implementación React Native con DateTimePicker

### 1. Instalar Dependencias

```bash
npx expo install @react-native-community/datetimepicker
```

### 2. Crear Types Actualizados

```typescript
// types/chofer.types.ts
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
  requiresDates?: boolean; // NUEVO: indica si requiere fechas
}

export interface ChoferEstadoData {
  estado_chofer: EstadoChofer;
  fecha_inicio_licencia?: string;
  fecha_fin_licencia?: string | null;
}
```

### 3. Pantalla Actualizada con DateTimePicker

```typescript
// screens/ChoferEstadoScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import apiClient from '../api/apiClient';
import { EstadoChofer, EstadoConfig, ChoferEstadoData } from '../types/chofer.types';

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
    requiresDates: true,
  },
  [EstadoChofer.LICENCIA_MEDICA]: {
    label: 'Licencia Médica',
    emoji: '🏥',
    color: '#fff',
    backgroundColor: '#E91E63',
    requiresDates: true,
  },
  [EstadoChofer.LICENCIA_ART]: {
    label: 'Licencia ART',
    emoji: '⚕️',
    color: '#fff',
    backgroundColor: '#F44336',
    requiresDates: true,
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
  const [fechaInicioActual, setFechaInicioActual] = useState<Date | null>(null);
  const [fechaFinActual, setFechaFinActual] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Modal de fechas
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedEstado, setSelectedEstado] = useState<EstadoChofer | null>(null);
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [fechaFin, setFechaFin] = useState<Date | null>(null);
  const [duracionDesconocida, setDuracionDesconocida] = useState(false);

  // DatePickers
  const [showDatePickerInicio, setShowDatePickerInicio] = useState(false);
  const [showDatePickerFin, setShowDatePickerFin] = useState(false);

  useEffect(() => {
    cargarEstadoActual();
  }, []);

  const cargarEstadoActual = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/v1/auth/me');

      if (response.data.chofer_id) {
        const choferResponse = await apiClient.get(
          `/api/v1/choferes/${response.data.chofer_id}`
        );
        setEstadoActual(choferResponse.data.estado_chofer);

        if (choferResponse.data.fecha_inicio_licencia) {
          setFechaInicioActual(new Date(choferResponse.data.fecha_inicio_licencia));
        }
        if (choferResponse.data.fecha_fin_licencia) {
          setFechaFinActual(new Date(choferResponse.data.fecha_fin_licencia));
        }
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

    if (config.requiresDates) {
      // Abrir modal de fechas
      setSelectedEstado(estado);
      setFechaInicio(new Date());
      setFechaFin(null);
      setDuracionDesconocida(false);
      setShowDateModal(true);
    } else {
      // Actualizar directamente sin fechas
      actualizarEstado(estado);
    }
  };

  const actualizarEstado = async (
    estado: EstadoChofer,
    fechaInicio?: Date,
    fechaFin?: Date | null
  ) => {
    try {
      setUpdating(true);

      const body: ChoferEstadoData = {
        estado_chofer: estado,
      };

      if (ESTADOS_CONFIG[estado].requiresDates && fechaInicio) {
        body.fecha_inicio_licencia = fechaInicio.toISOString();
        body.fecha_fin_licencia = fechaFin ? fechaFin.toISOString() : null;
      }

      await apiClient.patch('/api/v1/choferes/mi-estado', body);

      setEstadoActual(estado);

      if (ESTADOS_CONFIG[estado].requiresDates && fechaInicio) {
        setFechaInicioActual(fechaInicio);
        setFechaFinActual(fechaFin);
      } else {
        setFechaInicioActual(null);
        setFechaFinActual(null);
      }

      Alert.alert(
        'Estado Actualizado',
        `Tu estado se cambió a: ${ESTADOS_CONFIG[estado].label}`
      );

      setShowDateModal(false);
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

  const handleConfirmDates = () => {
    if (!selectedEstado) return;

    if (!duracionDesconocida && fechaFin && fechaFin < fechaInicio) {
      Alert.alert('Error', 'La fecha de fin no puede ser anterior a la fecha de inicio');
      return;
    }

    actualizarEstado(
      selectedEstado,
      fechaInicio,
      duracionDesconocida ? null : fechaFin
    );
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'No especificada';
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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

          {ESTADOS_CONFIG[estadoActual].requiresDates && fechaInicioActual && (
            <View style={styles.datesInfo}>
              <Text style={styles.dateLabel}>
                📅 Desde: {formatDate(fechaInicioActual)}
              </Text>
              {fechaFinActual && (
                <Text style={styles.dateLabel}>
                  📅 Hasta: {formatDate(fechaFinActual)}
                </Text>
              )}
              {!fechaFinActual && (
                <Text style={styles.dateLabel}>⏱️ Duración desconocida</Text>
              )}
            </View>
          )}
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

      {/* Modal de fechas */}
      <Modal
        visible={showDateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Fechas de Licencia</Text>
            <Text style={styles.modalSubtitle}>
              {selectedEstado && ESTADOS_CONFIG[selectedEstado].label}
            </Text>

            {/* Fecha de inicio */}
            <View style={styles.dateSection}>
              <Text style={styles.dateInputLabel}>Fecha de Inicio *</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowDatePickerInicio(true)}
              >
                <Text style={styles.dateInputText}>{formatDate(fechaInicio)}</Text>
                <Text style={styles.calendarIcon}>📅</Text>
              </TouchableOpacity>
            </View>

            {/* Duración desconocida checkbox */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setDuracionDesconocida(!duracionDesconocida)}
            >
              <View style={styles.checkbox}>
                {duracionDesconocida && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Duración desconocida</Text>
            </TouchableOpacity>

            {/* Fecha de fin (solo si no es duración desconocida) */}
            {!duracionDesconocida && (
              <View style={styles.dateSection}>
                <Text style={styles.dateInputLabel}>Fecha de Fin</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowDatePickerFin(true)}
                >
                  <Text style={styles.dateInputText}>
                    {formatDate(fechaFin)}
                  </Text>
                  <Text style={styles.calendarIcon}>📅</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* DatePicker para fecha inicio */}
            {showDatePickerInicio && (
              <DateTimePicker
                value={fechaInicio}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDatePickerInicio(Platform.OS === 'ios');
                  if (selectedDate) {
                    setFechaInicio(selectedDate);
                  }
                }}
              />
            )}

            {/* DatePicker para fecha fin */}
            {showDatePickerFin && !duracionDesconocida && (
              <DateTimePicker
                value={fechaFin || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={fechaInicio}
                onChange={(event, selectedDate) => {
                  setShowDatePickerFin(Platform.OS === 'ios');
                  if (selectedDate) {
                    setFechaFin(selectedDate);
                  }
                }}
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowDateModal(false);
                  setSelectedEstado(null);
                }}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleConfirmDates}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.modalButtonText,
                      styles.modalButtonTextConfirm,
                    ]}
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
  datesInfo: {
    marginTop: 16,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
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
  dateSection: {
    marginBottom: 16,
  },
  dateInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dateInput: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInputText: {
    fontSize: 16,
    color: '#333',
  },
  calendarIcon: {
    fontSize: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
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

## Características Implementadas

### ✅ Gestión de Fechas
- **DateTimePicker** nativo para selección de fechas
- **Fecha de inicio obligatoria** para licencias
- **Fecha de fin opcional** con checkbox "Duración desconocida"
- **Validación**: Fecha fin no puede ser anterior a fecha inicio
- **Formato**: Fechas en formato ISO 8601 para el backend

### ✅ UX Mejorado
- Modal intuitivo con calendarios nativos
- Checkbox para indicar duración desconocida
- Visualización de fechas actuales en el estado activo
- Limpieza automática de fechas al cambiar a estados no-licencia

### ✅ Estados Operacionales
- Los estados como "Cargando", "Viajando", etc. funcionan sin fechas
- Actualización directa sin modal adicional

## Credenciales de Prueba

```
Email: carlos.andrada@transporte.com
Password: chofer123
```

## Testing Manual

1. **Login como chofer**
2. **Probar Licencia con fechas:**
   - Seleccionar "Licencia Anual"
   - Elegir fecha de inicio y fin
   - Confirmar
   - Verificar que se muestren las fechas

3. **Probar Licencia sin fecha fin:**
   - Seleccionar "Licencia Médica"
   - Marcar "Duración desconocida"
   - Confirmar

4. **Cambiar a estado operacional:**
   - Seleccionar "Viajando"
   - Verificar que las fechas se limpien

## Validaciones del Backend

✅ Fecha inicio obligatoria para licencias
✅ Fecha fin debe ser >= fecha inicio
✅ Fechas solo permitidas en estados de licencia
✅ Limpieza automática al cambiar a estado no-licencia

## Resumen

Esta implementación completa permite:
- 🗓️ Gestión de fechas para licencias con DateTimePicker nativo
- ✅ Validaciones robustas en backend y frontend
- 📱 UX intuitiva con checkboxes y calendarios
- 🔄 Sincronización automática con el servidor
- 🎯 Soporte para duraciones desconocidas
