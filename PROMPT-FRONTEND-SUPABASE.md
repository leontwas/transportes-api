# Prompt para Frontend: Migrar React Native App a Supabase

**Contexto**: El backend NestJS ya está desplegado en Render conectado a Supabase. Ahora necesito actualizar el frontend de React Native para conectarse al backend en producción.

---

## 📋 Información del Backend

### URLs del API

**Producción (Render)**:
```
https://transportes-api-bp41.onrender.com
```

**Desarrollo local**:
```
http://192.168.0.23:3000
```

### Credenciales de Admin

```
Email: admin@transporte.com
Password: admin123
```

### Base de Datos

- **Provider**: Supabase
- **Región**: us-east-2 (AWS)
- **Estado**: ✅ Operacional

---

## 🎯 Tarea Principal

Actualizar el proyecto frontend de React Native para:

1. **Configurar múltiples ambientes** (desarrollo y producción)
2. **Actualizar URLs del API** para usar el servidor desplegado
3. **Verificar que todos los requests funcionen** correctamente
4. **Implementar detección automática** de ambiente (dev/prod)
5. **Opcional**: Agregar configuración para build de producción

---

## 📝 Requisitos Específicos

### 1. Configuración de URLs

Necesito que el app use:
- **En desarrollo** (`__DEV__` = true): `http://192.168.0.23:3000/api/v1`
- **En producción** (`__DEV__` = false): `https://transportes-api-bp41.onrender.com/api/v1`

### 2. Archivos a Modificar

Busca y actualiza los archivos que contengan:
- URLs hardcodeadas del API
- Configuración de axios o fetch
- Archivos de configuración (config.js, constants.js, etc.)
- Variables de entorno (.env si existe)

### 3. Estructura Esperada

Deberías crear o actualizar un archivo de configuración central como:

```javascript
// src/config/api.js (o similar)
const isDevelopment = __DEV__;

export const API_BASE_URL = isDevelopment
  ? 'http://192.168.0.23:3000/api/v1'
  : 'https://transportes-api-bp41.onrender.com/api/v1';

export const API_TIMEOUT = 30000; // 30 segundos

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
};
```

### 4. Verificaciones

Después de los cambios, verifica que funcionen:
- ✅ Login del admin
- ✅ Obtener lista de choferes
- ✅ Cambiar estado de un chofer
- ✅ Obtener viaje activo
- ✅ Todas las funciones críticas del app

---

## 🔍 Endpoints Principales del Backend

Estos son los endpoints que el frontend debe usar:

### Autenticación
```
POST /api/v1/auth/login
POST /api/v1/auth/register
GET  /api/v1/auth/me
```

### Choferes
```
GET    /api/v1/choferes
GET    /api/v1/choferes/:id_chofer
GET    /api/v1/choferes/mi-viaje-activo
PATCH  /api/v1/choferes/mi-estado
PATCH  /api/v1/choferes/:id_chofer/estado
```

### Viajes
```
GET    /api/v1/viajes
POST   /api/v1/viajes
GET    /api/v1/viajes/:id_viaje
DELETE /api/v1/viajes/:id_viaje
```

### Tractores
```
GET    /api/v1/tractores
POST   /api/v1/tractores
PATCH  /api/v1/tractores/:tractor_id
```

### Bateas
```
GET    /api/v1/bateas
POST   /api/v1/bateas
PATCH  /api/v1/bateas/:batea_id
```

---

## 🛠️ Pasos Recomendados

### Paso 1: Explorar el Código Actual

Busca archivos que contengan:
- `192.168.` (IP local actual)
- `localhost`
- `http://` (URLs hardcodeadas)
- `axios.create`
- `fetch(`

### Paso 2: Centralizar Configuración

Crea o actualiza un archivo central de configuración del API:
- `src/config/api.js`
- `src/services/api.js`
- `src/utils/axios.js`
- O similar según la estructura del proyecto

### Paso 3: Actualizar Servicios

Actualiza todos los archivos de servicios (services/) para usar la configuración centralizada.

### Paso 4: Variables de Entorno (Opcional pero Recomendado)

Si el proyecto usa `react-native-config` o similar:

**Crear `.env.development`:**
```env
API_URL=http://192.168.0.23:3000/api/v1
```

**Crear `.env.production`:**
```env
API_URL=https://transportes-api-bp41.onrender.com/api/v1
```

**Uso en código:**
```javascript
import Config from 'react-native-config';

export const API_BASE_URL = Config.API_URL;
```

### Paso 5: Testing

Prueba en modo desarrollo que todo funcione:
```bash
# React Native
npm start
# o
npx expo start
```

---

## ⚠️ Consideraciones Importantes

### 1. Cold Start de Render (Plan Free)

El servidor en Render se duerme después de 15 minutos de inactividad. La primera request después de que se duerme puede tardar ~30 segundos.

**Solución en el frontend:**
- Mostrar un loading spinner más tiempo
- Agregar timeout más largo (30-40 segundos)
- Mostrar mensaje informativo: "Iniciando servidor, por favor espera..."

**Ejemplo:**
```javascript
// En el componente de Login
const [isWakingUp, setIsWakingUp] = useState(false);

const handleLogin = async () => {
  setIsWakingUp(true);
  setTimeout(() => {
    setIsWakingUp(false);
  }, 5000);

  try {
    await login(email, password);
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      Alert.alert(
        'Servidor Iniciando',
        'El servidor está iniciando. Esto puede tardar hasta 30 segundos. Por favor, intenta nuevamente.',
      );
    }
  }
};
```

### 2. Timeout de Requests

Aumenta el timeout de axios/fetch para compensar el cold start:

```javascript
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 40000, // 40 segundos para el cold start
});
```

### 3. Manejo de Errores

Agrega manejo específico para errores de red:

```javascript
api.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNABORTED') {
      return Promise.reject({
        message: 'El servidor está iniciando. Por favor, intenta nuevamente en unos segundos.',
      });
    }
    return Promise.reject(error);
  }
);
```

---

## 🧪 Checklist de Verificación

Después de hacer los cambios, verifica:

- [ ] ✅ El app compila sin errores
- [ ] ✅ Puedes hacer login con `admin@transporte.com` / `admin123`
- [ ] ✅ La lista de choferes carga correctamente
- [ ] ✅ Puedes cambiar el estado de un chofer
- [ ] ✅ La navegación funciona correctamente
- [ ] ✅ Los tokens JWT se guardan y usan correctamente
- [ ] ✅ El logout funciona
- [ ] ✅ Manejo de errores de red funciona
- [ ] ✅ Loading states funcionan correctamente

---

## 📦 Estructura de Response del Backend

El backend devuelve respuestas en este formato:

**Login exitoso:**
```json
{
  "access_token": "eyJhbGc...",
  "usuario": {
    "usuario_id": 1,
    "email": "admin@transporte.com",
    "nombre": "Admin Sistema",
    "rol": "admin",
    "chofer_id": null
  }
}
```

**Error:**
```json
{
  "message": "Credenciales inválidas",
  "error": "Unauthorized",
  "statusCode": 401
}
```

**Lista de choferes:**
```json
[
  {
    "id_chofer": 1,
    "nombre_completo": "Juan Pérez",
    "estado_chofer": "disponible",
    "tractor": { ... },
    "batea": { ... }
  }
]
```

---

## 🎯 Resultado Esperado

Al finalizar, el frontend debe:

1. ✅ Conectarse automáticamente al servidor correcto según el ambiente
2. ✅ Funcionar en desarrollo con la IP local
3. ✅ Funcionar en producción con el servidor de Render
4. ✅ Manejar correctamente el cold start del servidor
5. ✅ Mostrar errores de red de manera user-friendly
6. ✅ Mantener la sesión del usuario con JWT

---

## 🔐 Notas de Seguridad

- ✅ El backend usa HTTPS en producción (SSL automático de Render)
- ✅ Los tokens JWT expiran en 24 horas
- ✅ Las contraseñas están hasheadas con bcrypt
- ✅ CORS está habilitado para todas las origins (desarrollo)

Para producción, considera restringir CORS en el backend a solo tu dominio.

---

## 📞 URLs de Referencia

- **API Producción**: https://transportes-api-bp41.onrender.com
- **Render Dashboard**: https://dashboard.render.com
- **Supabase Dashboard**: https://supabase.com/dashboard/project/mkthvbllpccrsanuyrlk
- **Documentación del Backend**: Ver archivos `.md` en el repo del backend

---

## 💡 Tips Adicionales

### Debugging

Si algo no funciona, revisa:

1. **Logs del servidor en Render**: https://dashboard.render.com → Logs
2. **Network requests en React Native Debugger**
3. **Console logs del frontend**

### Performance

Para mejorar el rendimiento:

1. Implementa caching de datos con AsyncStorage
2. Usa React Query o SWR para caching automático
3. Implementa pull-to-refresh en listas

### UX Improvements

1. Mostrar indicador cuando el servidor está en cold start
2. Implementar retry automático en caso de timeout
3. Guardar datos localmente para uso offline (opcional)

---

**Fecha**: 12 de enero de 2026
**Backend Version**: v1.0.0
**API URL**: https://transportes-api-bp41.onrender.com
**Status**: ✅ Operacional