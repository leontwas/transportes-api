# Implementación: Endpoint Mi Viaje Activo

**Fecha**: 12 de enero de 2026
**Estado**: ✅ Implementado

---

## 📋 Resumen

Se implementó el endpoint `GET /api/v1/choferes/mi-viaje-activo` que permite a los choferes autenticados obtener información de su viaje activo (si tienen uno asignado).

### Problema Resuelto

**Antes:**
- El frontend tenía que usar `GET /api/v1/viajes?chofer_id=${choferId}` y filtrar manualmente
- El chofer tenía que enviar su propio ID como parámetro de consulta
- Menos seguro y más propenso a errores

**Después:**
- Endpoint dedicado `GET /api/v1/choferes/mi-viaje-activo`
- El chofer_id se obtiene automáticamente del token JWT
- Respuesta optimizada con relaciones incluidas (tractor, batea)
- Más seguro y simple de usar

---

## 📝 Cambios Implementados

### Archivo: `src/choferes/choferes.controller.ts`

**Agregado nuevo endpoint:**

```typescript
@Get('mi-viaje-activo')
@Roles(RolUsuario.CHOFER)
async obtenerMiViajeActivo(@Request() req) {
  return this.choferesService.obtenerViajeActivo(req.user.chofer_id);
}
```

**Importante:** Este endpoint debe estar **ANTES** del endpoint `@Get(':id_chofer')` para evitar conflictos de rutas.

### Archivo: `src/choferes/choferes.service.ts`

**Agregado nuevo método:**

```typescript
async obtenerViajeActivo(chofer_id: number) {
  // Verificar que el chofer existe
  const chofer = await this.choferRepository.findOne({
    where: { id_chofer: chofer_id },
  });

  if (!chofer) {
    throw new NotFoundException(
      'Chofer no encontrado',
      `No existe un chofer con el ID ${chofer_id}`,
    );
  }

  // Buscar el viaje activo del chofer (cualquier estado excepto FINALIZADO)
  const viajeActivo = await this.viajeRepository.findOne({
    where: {
      chofer_id,
      estado_viaje: Not(EstadoViaje.FINALIZADO),
    },
    relations: ['tractor', 'batea', 'chofer'],
    order: { creado_en: 'DESC' },
  });

  // Si no hay viaje activo, devolver null
  if (!viajeActivo) {
    return null;
  }

  return viajeActivo;
}
```

---

## 🔌 API

### Endpoint: `GET /api/v1/choferes/mi-viaje-activo`

#### Caso 1: Chofer con viaje activo

**Request:**
```http
GET /api/v1/choferes/mi-viaje-activo
Authorization: Bearer <token_chofer>
```

**Response (200 OK):**
```json
{
  "id_viaje": 123,
  "origen": "Buenos Aires",
  "destino": "Rosario",
  "fecha_salida": "2026-01-12T10:00:00.000Z",
  "fecha_descarga": null,
  "estado_viaje": "en_curso",
  "numero_remito": "REM-001",
  "toneladas_cargadas": 30.5,
  "toneladas_descargadas": null,
  "hora_inicio_descanso": null,
  "hora_fin_descanso": null,
  "horas_descanso": null,
  "chofer_id": 1,
  "tractor_id": 1,
  "batea_id": 1,
  "creado_en": "2026-01-12T09:00:00.000Z",
  "actualizado_en": "2026-01-12T09:00:00.000Z",
  "tractor": {
    "tractor_id": 1,
    "patente": "AA001TR",
    "estado_tractor": "en_viaje",
    "chofer_id": 1
  },
  "batea": {
    "batea_id": 1,
    "patente": "AA001BA",
    "estado": "cargado",
    "chofer_id": 1
  },
  "chofer": {
    "id_chofer": 1,
    "nombre_completo": "Carlos Andrada",
    "estado_chofer": "viajando"
  }
}
```

#### Caso 2: Chofer sin viaje activo

**Request:**
```http
GET /api/v1/choferes/mi-viaje-activo
Authorization: Bearer <token_chofer>
```

**Response (200 OK):**
```json
null
```

#### Caso 3: No autenticado

**Request:**
```http
GET /api/v1/choferes/mi-viaje-activo
```

**Response (401 Unauthorized):**
```json
{
  "statusCode": 401,
  "message": "No autorizado"
}
```

#### Caso 4: Usuario con rol admin

**Request:**
```http
GET /api/v1/choferes/mi-viaje-activo
Authorization: Bearer <token_admin>
```

**Response (403 Forbidden):**
```json
{
  "statusCode": 403,
  "message": "No tienes permisos para acceder a este recurso"
}
```

---

## 🚦 Reglas de Negocio

### Lógica del Endpoint

1. **Autenticación obligatoria**: Solo usuarios con token JWT válido
2. **Solo rol chofer**: El rol debe ser `chofer` (admins no pueden acceder)
3. **Viajes activos**: Solo devuelve viajes con `estado_viaje !== 'FINALIZADO'`
4. **Más reciente**: Si hay múltiples viajes activos, devuelve el más reciente (`order by creado_en DESC`)
5. **Relaciones incluidas**: Siempre incluye `tractor`, `batea` y `chofer`

### Estados de Viaje Considerados "Activos"

- `en_curso`
- `cargando`
- `viajando`
- `descargando`
- `en_reclamo`

**NO se considera activo:**
- `finalizado`

---

## 🎯 Uso en el Frontend

### Ejemplo con React Native

```javascript
// services/viajeService.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

export const obtenerMiViajeActivo = async () => {
  const token = await AsyncStorage.getItem('token');

  const response = await axios.get(
    `${API_URL}/choferes/mi-viaje-activo`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  return response.data; // Puede ser un objeto Viaje o null
};
```

### Hook para Viaje Activo

```javascript
// hooks/useViajeActivo.js
import { useState, useEffect } from 'react';
import { obtenerMiViajeActivo } from '../services/viajeService';

export const useViajeActivo = () => {
  const [viaje, setViaje] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const fetchViaje = async () => {
    try {
      setCargando(true);
      const data = await obtenerMiViajeActivo();
      setViaje(data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al obtener viaje');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchViaje();
  }, []);

  return { viaje, cargando, error, refetch: fetchViaje };
};
```

### Uso en Componente

```javascript
// screens/HomeScreen.js
import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useViajeActivo } from '../hooks/useViajeActivo';

const HomeScreen = () => {
  const { viaje, cargando, error } = useViajeActivo();

  if (cargando) {
    return <ActivityIndicator size="large" />;
  }

  if (error) {
    return <Text>Error: {error}</Text>;
  }

  if (!viaje) {
    return (
      <View>
        <Text>No tienes viajes asignados actualmente</Text>
      </View>
    );
  }

  return (
    <View>
      <Text>Viaje Activo</Text>
      <Text>Destino: {viaje.destino}</Text>
      <Text>Tractor: {viaje.tractor.patente}</Text>
      <Text>Batea: {viaje.batea.patente}</Text>
      <Text>Estado: {viaje.estado_viaje}</Text>
    </View>
  );
};
```

---

## 🧪 Testing

### Script de Prueba: `test-mi-viaje-activo.js`

**Casos de prueba implementados:**

1. ✅ **Chofer sin viaje activo** - Devuelve `null`
2. ✅ **Crear viaje para chofer** - Asignar viaje de prueba
3. ✅ **Chofer con viaje activo** - Devuelve datos completos con relaciones
4. ✅ **Finalizar viaje** - Cambiar estado a `finalizado`
5. ✅ **Viaje finalizado no aparece** - Devuelve `null` después de finalizar
6. ✅ **Acceso sin autenticación** - Devuelve 401
7. ✅ **Acceso como admin** - Devuelve 403 (bloqueado)

### Prerequisitos del Test

**Crear usuario chofer de prueba:**

Ejecutar el SQL en `crear-usuario-chofer-test.sql` (ya creado anteriormente):

```sql
INSERT INTO usuarios (email, password, nombre_completo, rol, chofer_id, creado_en)
SELECT
  'chofer.test@transporte.com',
  '$2b$10$SIO58XQYUe1C48c2cbP9DObipcHtuD/We2lnpwkAsP2/qaqy1Rshu', -- chofer123
  'Chofer Test',
  'chofer',
  1,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM usuarios WHERE email = 'chofer.test@transporte.com'
);
```

### Ejecutar el Test

```bash
# 1. Crear el usuario chofer (si no existe)
# Ejecutar el SQL manualmente en pgAdmin o psql

# 2. Ejecutar el test
node test-mi-viaje-activo.js
```

---

## 📊 Comparación: Antes vs Después

### Antes (Usando /viajes con filtro)

```javascript
// Frontend tenía que hacer esto:
const meResponse = await axios.get('/api/v1/auth/me', {
  headers: { Authorization: `Bearer ${token}` }
});

const choferId = meResponse.data.chofer_id;

const viajesResponse = await axios.get(
  `/api/v1/viajes?chofer_id=${choferId}`,
  { headers: { Authorization: `Bearer ${token}` } }
);

// Filtrar manualmente viajes no finalizados
const viajeActivo = viajesResponse.data.find(
  v => v.estado_viaje !== 'finalizado'
);
```

**Problemas:**
- 2 requests necesarios
- Filtrado manual en el frontend
- Chofer tiene que enviar su propio ID (menos seguro)
- Sin ordenamiento consistente

### Después (Usando /mi-viaje-activo)

```javascript
// Ahora es mucho más simple:
const viajeActivo = await axios.get(
  '/api/v1/choferes/mi-viaje-activo',
  { headers: { Authorization: `Bearer ${token}` } }
);

// viajeActivo.data es el viaje o null
```

**Ventajas:**
- ✅ 1 solo request
- ✅ Filtrado en el backend
- ✅ Más seguro (chofer_id del token)
- ✅ Ordenamiento garantizado (más reciente)
- ✅ Relaciones incluidas automáticamente

---

## 🔒 Seguridad

### Validaciones Implementadas

1. **Autenticación JWT**: Requiere token válido
2. **Role Guard**: Solo rol `chofer` puede acceder
3. **Extracción segura del chofer_id**: Se obtiene del token, no del cliente
4. **Validación de existencia**: Verifica que el chofer existe antes de buscar viajes

### Prevención de Ataques

- ❌ **NO** se puede acceder a viajes de otros choferes
- ❌ **NO** se puede acceder sin autenticación
- ❌ **NO** se pueden manipular los filtros desde el cliente
- ❌ Admins **NO** pueden usar este endpoint (deben usar otros endpoints de admin)

---

## 📄 Archivos Modificados

1. **`src/choferes/choferes.controller.ts`**
   - Agregado endpoint `@Get('mi-viaje-activo')`
   - Configurado con `@Roles(RolUsuario.CHOFER)`

2. **`src/choferes/choferes.service.ts`**
   - Agregado método `obtenerViajeActivo(chofer_id: number)`
   - Consulta con `Not(EstadoViaje.FINALIZADO)`
   - Incluye relaciones `tractor`, `batea`, `chofer`

3. **`test-mi-viaje-activo.js`** (nuevo)
   - Script de pruebas completo
   - 7 casos de prueba
   - Verificación de permisos y lógica

4. **`IMPLEMENTACION-MI-VIAJE-ACTIVO.md`** (nuevo)
   - Documentación completa de la implementación

---

## ✅ Checklist de Implementación

### Backend (✅ Completado)
- [x] Endpoint creado en el controlador
- [x] Método de servicio implementado
- [x] Guards configurados (JWT + Roles)
- [x] Filtrado de viajes finalizados
- [x] Relaciones incluidas
- [x] Manejo de errores
- [x] Tests creados
- [x] Documentación completa

### Frontend (📝 Por Implementar)
- [ ] Crear servicio `obtenerMiViajeActivo()`
- [ ] Crear hook `useViajeActivo()`
- [ ] Actualizar pantalla de inicio para mostrar viaje activo
- [ ] Manejar casos de null (sin viaje)
- [ ] Testing del flujo completo

---

## 🔄 Próximos Pasos

### Para el Backend
1. ✅ Implementación completa
2. ⏳ Ejecutar tests con usuario chofer creado
3. ⏳ Verificar performance con datos reales

### Para el Frontend
1. Actualizar servicio de viajes
2. Implementar hook `useViajeActivo`
3. Actualizar HomeScreen para usar el nuevo endpoint
4. Remover lógica antigua de filtrado manual
5. Testing en dispositivo móvil

---

## 📞 Endpoint Disponible

### URL
```
GET http://192.168.0.146:3000/api/v1/choferes/mi-viaje-activo
```

### Headers Requeridos
```
Authorization: Bearer <token_jwt_del_chofer>
```

### Respuesta
```typescript
Viaje | null
```

---

**Implementación completada exitosamente** ✅
**Fecha**: 12 de enero de 2026
**Probado**: Pendiente (requiere crear usuario chofer)
**Documentado**: Sí, completamente