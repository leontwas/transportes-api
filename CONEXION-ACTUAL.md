# Estado de Conexión del Servidor - Backend

**Fecha de verificación**: 11 de enero de 2026
**Estado**: ✅ Servidor activo y accesible

---

## 🌐 Información de Red

### Direcciones IP Disponibles

| Interfaz | Dirección IP | Estado | Uso |
|----------|-------------|--------|-----|
| **Wi-Fi** | `192.168.0.146` | ✅ Activa | **Usar esta para el frontend móvil** |
| Loopback | `127.0.0.1` | ✅ Activa | Solo para desarrollo local |
| Área local* 1 | `169.254.158.180` | ⚠️ APIPA | No usar |
| Área local* 2 | `169.254.155.162` | ⚠️ APIPA | No usar |

### Puerto del Servidor

- **Puerto**: `3000`
- **Estado**: ✅ Escuchando en todas las interfaces (`0.0.0.0:3000`)
- **Proceso**: PID 19344

---

## 📱 URL para el Frontend Móvil

### URL Base para la App de Choferes

```
http://192.168.0.146:3000/api/v1
```

### Ejemplo de Configuración en React Native

```javascript
// config/api.js
export const API_URL = 'http://192.168.0.146:3000/api/v1';

// O si usas variables de entorno
// .env
API_URL=http://192.168.0.146:3000/api/v1
```

---

## ✅ Verificación de Conectividad

### Prueba desde el navegador del celular

Abre el navegador de tu celular (conectado a la misma red Wi-Fi) y accede a:

```
http://192.168.0.146:3000/api/v1/choferes
```

**Respuesta esperada:**
```json
{
  "error": "Unauthorized",
  "message": "No se proporcionó token de autenticación",
  "statusCode": 401,
  "action": "Inicia sesión para continuar"
}
```

✅ Si ves este mensaje, la conexión funciona correctamente.

### Prueba de Login desde el celular

```bash
# Desde Postman o similar
POST http://192.168.0.146:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@transporte.com",
  "password": "admin123"
}
```

**Respuesta esperada:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@transporte.com",
    "rol": "admin"
  }
}
```

---

## 🔧 Configuración del Backend

### Main.ts - Configuración Actual

El servidor está configurado para aceptar conexiones desde cualquier IP:

```typescript
// src/main.ts
await app.listen(3000, '0.0.0.0');
```

✅ **No requiere cambios** - Ya está configurado correctamente para red local.

### CORS Habilitado

El servidor tiene CORS habilitado para aceptar requests desde cualquier origen:

```typescript
app.enableCors();
```

✅ **No requiere cambios** - Ya permite conexiones desde el frontend móvil.

---

## 📋 Checklist de Conexión

### Para el Desarrollador del Frontend

- [x] Verificar que el celular esté conectado a la misma red Wi-Fi
- [x] Usar la IP `192.168.0.146` en lugar de `localhost`
- [x] Usar el puerto `3000`
- [x] Verificar que el servidor backend esté corriendo
- [ ] Actualizar la configuración de API_URL en el frontend
- [ ] Probar login desde la app móvil
- [ ] Probar endpoints de choferes desde la app móvil

### Comandos de Verificación

```bash
# En la PC del backend
# 1. Verificar que el servidor esté corriendo
netstat -ano | findstr :3000

# 2. Ver la IP actual de Wi-Fi
ipconfig | findstr "IPv4"

# 3. Probar conexión local
curl http://192.168.0.146:3000/api/v1/choferes
```

---

## ⚠️ Importante: Red Wi-Fi

### Requisitos

1. **Misma red Wi-Fi**: El celular y la PC deben estar conectados a la misma red Wi-Fi
2. **Red privada**: Asegúrate de que Windows esté configurado en "Red privada" (no "Red pública")
3. **Firewall**: Si hay problemas, verifica que el firewall de Windows permita conexiones en el puerto 3000

### Verificar Red Privada

```powershell
# PowerShell (Ejecutar como Administrador)
Get-NetConnectionProfile
```

Si aparece como "Public", cambiar a "Private":

```powershell
Set-NetConnectionProfile -InterfaceAlias "Wi-Fi" -NetworkCategory Private
```

---

## 🔥 Configuración del Firewall

Si el celular no puede conectarse, agregar regla de firewall:

```powershell
# PowerShell (Ejecutar como Administrador)
New-NetFirewallRule -DisplayName "NestJS Backend API" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

---

## 🧪 Prueba Rápida de Conexión

### Desde PowerShell (en la PC)

```powershell
# Probar desde la IP de Wi-Fi
curl http://192.168.0.146:3000/api/v1/choferes
```

**Resultado esperado:**
```
{"error":"Unauthorized","message":"No se proporcionó token de autenticación",...}
```

### Desde el Navegador del Celular

1. Conectar el celular a la misma red Wi-Fi
2. Abrir navegador
3. Ir a: `http://192.168.0.146:3000/api/v1/choferes`
4. Debe aparecer el mensaje de "Unauthorized"

---

## 📊 Estado Actual

| Componente | Estado | Notas |
|------------|--------|-------|
| Servidor Backend | ✅ Activo | Puerto 3000 |
| IP Wi-Fi | ✅ 192.168.0.146 | Estable |
| CORS | ✅ Habilitado | Acepta todas las origins |
| Binding | ✅ 0.0.0.0 | Escucha en todas las interfaces |
| Firewall | ⚠️ Verificar | Puede requerir configuración |

---

## 🔄 Si la IP Cambia

La IP `192.168.0.146` es asignada por DHCP y puede cambiar. Si esto ocurre:

### Opción 1: Verificar Nueva IP

```bash
ipconfig | findstr "IPv4"
```

### Opción 2: Usar IP Estática (Recomendado para desarrollo)

1. Abrir "Configuración de Red e Internet"
2. Click en "Wi-Fi" → "Propiedades"
3. En "Configuración de IP" → "Editar"
4. Cambiar a "Manual"
5. Configurar:
   - IP: `192.168.0.146`
   - Máscara: `255.255.255.0`
   - Puerta de enlace: `192.168.0.1` (o tu router)
   - DNS: `8.8.8.8` y `8.8.4.4`

---

## 📞 Soporte

Si tienes problemas de conexión:

1. Verificar que ambos dispositivos están en la misma red Wi-Fi
2. Hacer ping desde el celular a la PC: `ping 192.168.0.146`
3. Verificar que el servidor backend esté corriendo
4. Revisar logs del servidor para errores
5. Verificar configuración del firewall

---

**Última actualización**: 11 de enero de 2026
**IP Actual**: `192.168.0.146`
**Estado del Servidor**: ✅ Operativo