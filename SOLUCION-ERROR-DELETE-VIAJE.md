# Solución: Error 400 al Eliminar Viaje

## 🔍 Diagnóstico

### Problema Reportado
Al intentar eliminar un viaje desde el frontend, se recibe el error:
```
AxiosError: Request failed with status code 400
```

### Causa Identificada

El endpoint `DELETE /api/v1/viajes/:id_viaje` utiliza **ParseIntPipe** en el controller (línea 16 de viajes.controller.ts):

```typescript
@Delete(':id_viaje')
@Roles(RolUsuario.ADMIN)
async eliminar(
    @Param('id_viaje', ParseIntPipe) id_viaje: number,  // ← ParseIntPipe valida aquí
    @Request() req
) {
    return this.viajesService.eliminar(id_viaje, req.user);
}
```

**ParseIntPipe** valida que el parámetro sea un número entero válido. Si el valor no es válido, retorna **400 Bad Request** ANTES de ejecutar el método eliminar().

### Valores que Causan Error 400

❌ **Estos valores causan error 400:**
- `undefined` → `DELETE /api/v1/viajes/undefined`
- `null` → `DELETE /api/v1/viajes/null`
- `""` (string vacío) → `DELETE /api/v1/viajes/`
- `"abc"` → `DELETE /api/v1/viajes/abc`
- `NaN` → `DELETE /api/v1/viajes/NaN`
- Valores decimales → `DELETE /api/v1/viajes/1.5`

✅ **Estos valores son válidos:**
- `1` → `DELETE /api/v1/viajes/1`
- `123` → `DELETE /api/v1/viajes/123`
- `"456"` (string numérico) → `DELETE /api/v1/viajes/456` ← Se convierte automáticamente

## 🛠️ Soluciones

### Solución 1: Validar en el Frontend (RECOMENDADO)

Antes de hacer la petición DELETE, valida que el ID sea un número válido:

```javascript
// ❌ MAL - No valida el ID
const eliminarViaje = async (id_viaje) => {
    try {
        await axios.delete(`${API_URL}/viajes/${id_viaje}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    } catch (error) {
        console.error(error);
    }
};

// ✅ BIEN - Valida el ID antes de enviar
const eliminarViaje = async (id_viaje) => {
    // Validación 1: Verificar que el ID existe
    if (!id_viaje) {
        console.error('Error: ID de viaje no proporcionado');
        alert('Error: No se puede eliminar un viaje sin ID');
        return;
    }

    // Validación 2: Verificar que es un número válido
    const idNumerico = parseInt(id_viaje, 10);
    if (isNaN(idNumerico) || idNumerico <= 0) {
        console.error(`Error: ID inválido: ${id_viaje}`);
        alert(`Error: El ID del viaje (${id_viaje}) no es válido`);
        return;
    }

    // Validación 3: Confirmar eliminación
    const confirmacion = window.confirm(
        `¿Está seguro de eliminar el viaje #${idNumerico}?\n\n` +
        'Esta acción liberará el chofer, tractor y batea asociados.'
    );

    if (!confirmacion) {
        console.log('Eliminación cancelada por el usuario');
        return;
    }

    try {
        const response = await axios.delete(
            `${API_URL}/viajes/${idNumerico}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log('✓ Viaje eliminado:', response.data);
        alert(`Viaje #${idNumerico} eliminado correctamente`);

        // Recargar lista de viajes o actualizar estado
        await obtenerViajes();

    } catch (error) {
        console.error('Error al eliminar viaje:', error);

        if (error.response) {
            const status = error.response.status;
            const mensaje = error.response.data?.message || 'Error desconocido';

            if (status === 400) {
                alert(`Error 400: Petición inválida\n${mensaje}`);
            } else if (status === 403) {
                alert('Error 403: No tiene permisos para eliminar viajes');
            } else if (status === 404) {
                alert(`Error 404: El viaje #${idNumerico} no existe`);
            } else {
                alert(`Error ${status}: ${mensaje}`);
            }
        } else {
            alert('Error: No se pudo conectar con el servidor');
        }
    }
};
```

### Solución 2: Verificar Origen del ID

Si el ID proviene de un componente o lista, asegúrate de que esté correctamente pasado:

```javascript
// ❌ MAL - ID puede ser undefined
<button onClick={() => eliminarViaje(viaje.id)}>Eliminar</button>

// ✅ BIEN - Usar el campo correcto
<button onClick={() => eliminarViaje(viaje.id_viaje)}>Eliminar</button>

// ✅ MEJOR - Validar antes de pasar
<button
    onClick={() => {
        if (viaje?.id_viaje) {
            eliminarViaje(viaje.id_viaje);
        } else {
            console.error('Error: viaje.id_viaje no está definido');
        }
    }}
>
    Eliminar
</button>
```

### Solución 3: Logging para Debugging

Agrega logs para identificar el problema:

```javascript
const eliminarViaje = async (id_viaje) => {
    // Logging para debugging
    console.log('🔍 Intentando eliminar viaje:');
    console.log('  - ID recibido:', id_viaje);
    console.log('  - Tipo:', typeof id_viaje);
    console.log('  - Es número?', !isNaN(id_viaje));
    console.log('  - Valor parseado:', parseInt(id_viaje, 10));

    // ... resto del código
};
```

## 🧪 Pruebas desde el Frontend

### Test 1: Eliminación Normal
```javascript
eliminarViaje(1); // ✅ Debe funcionar
```

### Test 2: ID Inválido
```javascript
eliminarViaje(undefined); // ❌ Debe mostrar error en frontend (NO enviar al backend)
eliminarViaje(null);      // ❌ Debe mostrar error en frontend
eliminarViaje("abc");     // ❌ Debe mostrar error en frontend
```

### Test 3: Viaje Inexistente
```javascript
eliminarViaje(99999); // ✅ Backend debe retornar 404
```

## 📊 Respuestas del Endpoint

### ✅ Eliminación Exitosa (200 OK)
```json
{
  "message": "Viaje eliminado correctamente",
  "viaje_id": 11,
  "recursos_liberados": {
    "chofer": {
      "id": 1,
      "nombre": "Leonardo Daniel Lipiejko",
      "nuevo_estado": "disponible"
    },
    "tractor": {
      "id": 1,
      "patente": "AA040TR",
      "nuevo_estado": "libre"
    },
    "batea": {
      "id": 1,
      "patente": "AA050BA",
      "nuevo_estado": "vacio"
    }
  }
}
```

### ❌ Error 400 (ParseIntPipe)
```json
{
  "statusCode": 400,
  "message": "Validation failed (numeric string is expected)",
  "error": "Bad Request"
}
```

**Causa:** El ID enviado no es un número válido.

### ❌ Error 403 (Forbidden)
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

**Causa:** El usuario no tiene rol ADMIN.

### ❌ Error 404 (Not Found)
```json
{
  "statusCode": 404,
  "message": "El viaje con ID 99999 no existe",
  "error": "Not Found"
}
```

**Causa:** El viaje no existe en la base de datos.

## 🔍 Cómo Identificar el Problema

### En el Frontend

1. **Abrir DevTools del navegador** (F12)
2. **Ir a la pestaña Network**
3. **Intentar eliminar un viaje**
4. **Buscar la petición DELETE a `/api/v1/viajes/...`**
5. **Verificar:**
   - ¿Qué URL se llamó? (debe ser `/api/v1/viajes/[NUMERO]`)
   - ¿Qué status code retornó? (200, 400, 403, 404)
   - ¿Qué dice el Response?

### En el Backend

Los logs del servidor ahora muestran información detallada:

```
[ViajesService] [DELETE] Iniciando eliminación de viaje ID=11 por usuario Admin
[ViajesService] [DELETE] Encontrado viaje ID=11, iniciando eliminación...
[ViajesService] ✓ Tractor AA040TR liberado (estado: LIBRE)
[ViajesService] ✓ Batea AA050BA liberada (estado: VACIO)
[ViajesService] ✓ Chofer Leonardo Daniel Lipiejko liberado (estado: DISPONIBLE)
[ViajesService] [AUDITORÍA] Admin Administrador del Sistema eliminó viaje ID=11...
```

Si hay un error, verás:
```
[ViajesService] [DELETE] Error al eliminar viaje ID=11: [mensaje de error]
```

## ✅ Checklist de Verificación

Antes de llamar al endpoint DELETE, verifica:

- [ ] El ID del viaje existe y es válido
- [ ] El ID es un número (no undefined, null, string no numérico)
- [ ] El usuario está autenticado (tiene token JWT)
- [ ] El usuario tiene rol ADMIN
- [ ] El viaje existe en la base de datos
- [ ] Hay confirmación del usuario antes de eliminar

## 📝 Ejemplo Completo React

```jsx
import { useState } from 'react';
import axios from 'axios';

const ViajesList = () => {
    const [viajes, setViajes] = useState([]);
    const token = localStorage.getItem('token');

    const eliminarViaje = async (id_viaje) => {
        // Validaciones
        if (!id_viaje || isNaN(parseInt(id_viaje, 10))) {
            alert('Error: ID de viaje inválido');
            return;
        }

        if (!window.confirm(`¿Eliminar viaje #${id_viaje}?`)) {
            return;
        }

        try {
            const response = await axios.delete(
                `http://localhost:3000/api/v1/viajes/${id_viaje}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert(response.data.message);

            // Actualizar lista
            setViajes(viajes.filter(v => v.id_viaje !== id_viaje));

        } catch (error) {
            const status = error.response?.status;
            const mensaje = error.response?.data?.message;

            if (status === 400) {
                alert('Error: Petición inválida');
            } else if (status === 403) {
                alert('Error: No tienes permisos para eliminar viajes');
            } else if (status === 404) {
                alert('Error: El viaje no existe');
            } else {
                alert('Error al eliminar el viaje');
            }

            console.error('Error completo:', error);
        }
    };

    return (
        <div>
            {viajes.map(viaje => (
                <div key={viaje.id_viaje}>
                    <span>Viaje #{viaje.id_viaje}</span>
                    <button onClick={() => eliminarViaje(viaje.id_viaje)}>
                        Eliminar
                    </button>
                </div>
            ))}
        </div>
    );
};

export default ViajesList;
```

## 🎯 Resumen

**El error 400 ocurre porque:**
- El frontend está enviando un ID inválido (undefined, null, string no numérico)
- El ParseIntPipe de NestJS rechaza la petición ANTES de llegar al servicio

**La solución es:**
- Validar el ID en el frontend ANTES de hacer la petición DELETE
- Verificar que el ID proviene del campo correcto (`viaje.id_viaje`)
- Agregar confirmación antes de eliminar
- Manejar errores apropiadamente

---

**Fecha**: 9 de enero de 2026
**Estado**: ✅ Diagnosticado y solucionado
**Pruebas**: ✅ El endpoint funciona correctamente cuando se envía un ID válido
