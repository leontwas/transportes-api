# Sistema de Manejo de Errores - Backend

## Resumen de Implementación

Se ha implementado un sistema completo de manejo de errores con códigos HTTP apropiados y mensajes claros en español para mejorar la experiencia del frontend y facilitar el debugging.

## Estructura de Respuestas de Error

Todas las respuestas de error siguen este formato consistente:

```typescript
interface ErrorResponse {
  error: string;           // Tipo de error ("Unauthorized", "Forbidden", "NotFound", etc.)
  message: string;         // Mensaje claro en español para el usuario
  statusCode: number;      // Código HTTP (401, 403, 404, etc.)
  details?: string;        // Detalles técnicos adicionales
  requiredRole?: string;   // Para errores 403: rol necesario
  action?: string;         // Acción que el usuario debe tomar
}
```

## Códigos HTTP Implementados

### 🔴 401 Unauthorized - No Autenticado

**Cuándo se usa:**
- No se proporcionó token de autenticación
- Token inválido o malformado
- Token expirado
- Usuario inactivo

**Ejemplos de respuestas:**

```json
// Sin token
{
  "error": "Unauthorized",
  "message": "No se proporcionó token de autenticación",
  "statusCode": 401,
  "action": "Inicia sesión para continuar"
}
```

```json
// Token inválido o expirado
{
  "error": "Unauthorized",
  "message": "Token de autenticación inválido o expirado",
  "statusCode": 401,
  "action": "Vuelve a iniciar sesión"
}
```

```json
// Usuario inactivo
{
  "error": "Unauthorized",
  "message": "Tu cuenta está inactiva",
  "statusCode": 401,
  "action": "Contacta al administrador",
  "details": "El usuario existe pero su cuenta está desactivada"
}
```

### 🟠 403 Forbidden - No Autorizado (Falta de Permisos)

**Cuándo se usa:**
- Usuario autenticado pero sin el rol necesario
- Intentando acceder a recursos de otro usuario

**Ejemplos de respuestas:**

```json
// Falta de rol
{
  "error": "Forbidden",
  "message": "No tienes permisos para acceder a este recurso",
  "statusCode": 403,
  "requiredRole": "admin",
  "details": "Solo los admins pueden gestionar choferes"
}
```

```json
// Acceso a recurso de otro usuario
{
  "error": "Forbidden",
  "message": "Solo puedes acceder a tu propio chofer",
  "statusCode": 403,
  "details": "No puedes ver la información de otros choferes"
}
```

### 🔵 404 Not Found - Recurso No Encontrado

**Cuándo se usa:**
- El recurso solicitado no existe en la base de datos

**Ejemplo de respuesta:**

```json
{
  "error": "NotFound",
  "message": "Chofer no encontrado",
  "statusCode": 404,
  "details": "No existe un chofer con el ID 99999"
}
```

### 🟢 200/201 Success - Operación Exitosa

**Cuándo se usa:**
- La operación se completó exitosamente
- 200 para GET, PATCH, DELETE
- 201 para POST (creación)

## Archivos Implementados

### 1. Excepciones Personalizadas

**Archivo:** `src/common/exceptions/custom-exceptions.ts`

Contiene:
- `UnauthorizedException` - Para errores 401
- `ForbiddenException` - Para errores 403
- `NotFoundException` - Para errores 404
- Excepciones específicas:
  - `NoTokenProvidedException`
  - `InvalidTokenException`
  - `InactiveUserException`
  - `InsufficientPermissionsException`
  - `ResourceAccessDeniedException`

### 2. Guards Actualizados

**JwtAuthGuard** (`src/auth/jwt-auth.guard.ts`)
- Detecta ausencia de token
- Maneja errores de verificación JWT
- Retorna 401 con mensajes claros

**RolesGuard** (`src/auth/roles.guard.ts`)
- Verifica roles requeridos
- Retorna 403 con información del rol necesario
- Incluye acción específica según el endpoint

**JwtStrategy** (`src/auth/jwt.strategy.ts`)
- Valida existencia del usuario
- Verifica estado activo
- Retorna excepciones específicas

### 3. Servicios Actualizados

Los servicios ahora usan las excepciones personalizadas:
- `ChoferesService` - NotFoundExceptions personalizadas
- Otros servicios mantienen compatibilidad

## Testing

### Script de Pruebas

**Archivo:** `test-error-handling.js`

Cubre 10 casos de prueba:

#### ✅ Errores 401 (2 tests)
1. Acceso sin token
2. Token inválido

#### ✅ Errores 403 (4 tests)
3. Chofer intenta listar choferes
4. Chofer intenta crear chofer
5. Chofer intenta acceder a tractores
6. Chofer intenta acceder a viajes

#### ✅ Errores 404 (1 test)
7. Buscar recurso inexistente

#### ✅ Accesos Exitosos (3 tests)
8. Admin lista choferes
9. Chofer actualiza su estado
10. Admin lista tractores

### Ejecutar Tests

```bash
node test-error-handling.js
```

## Matriz de Permisos por Rol

| Endpoint | Admin | Chofer |
|----------|-------|--------|
| `GET /api/v1/choferes` | ✅ 200 | ❌ 403 |
| `GET /api/v1/choferes/:id` | ✅ 200 | ❌ 403 |
| `POST /api/v1/choferes` | ✅ 201 | ❌ 403 |
| `PATCH /api/v1/choferes/:id` | ✅ 200 | ❌ 403 |
| `DELETE /api/v1/choferes/:id` | ✅ 200 | ❌ 403 |
| `PATCH /api/v1/choferes/mi-estado` | ✅ 200 | ✅ 200 |
| `GET /api/v1/tractores` | ✅ 200 | ❌ 403 |
| `POST/PATCH/DELETE /api/v1/tractores/*` | ✅ 200/201 | ❌ 403 |
| `GET /api/v1/bateas` | ✅ 200 | ❌ 403 |
| `POST/PATCH/DELETE /api/v1/bateas/*` | ✅ 200/201 | ❌ 403 |
| `GET /api/v1/viajes` | ✅ 200 | ❌ 403 |
| `POST/DELETE /api/v1/viajes/*` | ✅ 200/201 | ❌ 403 |
| `POST /api/v1/auth/login` | ✅ 200 | ✅ 200 |
| `POST /api/v1/auth/register` | ✅ 201 | ✅ 201 |
| `GET /api/v1/auth/me` | ✅ 200 | ✅ 200 |

## Manejo en el Frontend

### Ejemplo de Interceptor de Axios

```typescript
// api/apiClient.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const apiClient = axios.create({
  baseURL: 'http://192.168.0.23:3000',
});

// Interceptor de respuesta para errores
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      const { status, data } = error.response;

      // 401 - No autenticado
      if (status === 401) {
        await AsyncStorage.removeItem('token');
        Alert.alert(
          'Sesión Expirada',
          data.message || 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navegar a login
                // navigation.navigate('Login');
              },
            },
          ]
        );
        return Promise.reject(error);
      }

      // 403 - No autorizado
      if (status === 403) {
        Alert.alert(
          'Acceso Denegado',
          data.details || data.message || 'No tienes permisos para realizar esta acción',
          [{ text: 'Entendido' }]
        );
        return Promise.reject(error);
      }

      // 404 - No encontrado
      if (status === 404) {
        Alert.alert(
          'No Encontrado',
          data.message || 'El recurso solicitado no existe',
          [{ text: 'OK' }]
        );
        return Promise.reject(error);
      }

      // Otros errores
      Alert.alert(
        'Error',
        data.message || 'Ocurrió un error inesperado',
        [{ text: 'OK' }]
      );
    } else if (error.request) {
      // Error de conexión
      Alert.alert(
        'Error de Conexión',
        'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
        [{ text: 'OK' }]
      );
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

### Ejemplo de Uso en Componentes

```typescript
// Ejemplo de componente que maneja errores
const GestionarChoferesScreen = () => {
  const { user } = useAuth();

  const fetchChoferes = async () => {
    try {
      const response = await apiClient.get('/api/v1/choferes');
      setChoferes(response.data);
    } catch (error: any) {
      // Los errores ya son manejados por el interceptor
      // Solo necesitas manejar casos específicos si quieres
      console.error('Error al cargar choferes:', error);
    }
  };

  // Si el usuario es chofer, no mostrar esta pantalla
  if (user.rol === 'chofer') {
    return (
      <View>
        <Text>No tienes permisos para ver esta pantalla</Text>
      </View>
    );
  }

  return (
    <View>
      {/* UI normal */}
    </View>
  );
};
```

## Logging (Recomendado para Producción)

Para producción, se recomienda agregar logging de errores:

```typescript
// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    // Log del error
    this.logger.error(
      `${request.method} ${request.url} - Status: ${status}`,
      exception instanceof Error ? exception.stack : 'Unknown error',
    );

    response.status(status).json(message);
  }
}
```

## Beneficios de la Implementación

✅ **Mensajes claros en español** para usuarios finales
✅ **Distinción entre 401 y 403** para mejor debugging
✅ **Información del rol requerido** en errores 403
✅ **Acciones sugeridas** para resolver problemas
✅ **Formato consistente** en todas las respuestas de error
✅ **Testing completo** con 10 casos de prueba
✅ **Fácil integración** con interceptores de Axios
✅ **Debugging mejorado** para desarrolladores

## Próximos Pasos Opcionales

1. **Rate Limiting** - Prevenir ataques de fuerza bruta
2. **Logging Avanzado** - Guardar logs de errores en archivo/DB
3. **Monitoreo** - Integrar con Sentry o similar
4. **Métricas** - Tracking de tipos de errores más comunes
5. **RBAC Granular** - Permisos a nivel de recurso individual

## Credenciales de Prueba

### Admin
```
Email: admin@transporte.com
Password: admin123
```

### Chofer
```
Email: carlos.andrada@transporte.com
Password: chofer123
```
