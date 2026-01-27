# Deploy en Render - Guía Completa

**Fecha**: 12 de enero de 2026
**Estado**: ✅ Configurado para Supabase

---

## 📋 Prerequisitos

- ✅ Código en GitHub
- ✅ Base de datos en Supabase configurada
- ✅ Usuario admin creado

---

## 🚀 Pasos para Deploy

### 1. Crear Web Service en Render

1. Ve a https://dashboard.render.com
2. Click en **"New +"** → **"Web Service"**
3. Conecta tu repositorio: `https://github.com/leontwas/transportes-api`

### 2. Configuración del Servicio

**Basic Settings:**
- **Name**: `tractores-api` (o el nombre que prefieras)
- **Region**: `Oregon (US West)` o el más cercano
- **Branch**: `master`
- **Root Directory**: (dejar vacío)
- **Runtime**: `Node`

**Build & Deploy:**
```bash
# Build Command (IMPORTANTE: instalar todo incluyendo devDependencies)
npm install && npm run build

# Start Command
npm run start:prod
```

**Advanced Settings:**
- **Auto-Deploy**: `Yes` (para deploy automático en cada push)

### 3. Variables de Entorno

Click en **"Environment"** y agrega estas variables:

```env
DATABASE_URL=postgresql://postgres.mkthvbllpccrsanuyrlk:leonardolipiejko@aws-1-us-east-2.pooler.supabase.com:6543/postgres

JWT_SECRET=leon447578

JWT_EXPIRATION=24h

NODE_ENV=production

DB_SYNC=false

PORT=3000
```

**⚠️ IMPORTANTE**:
- `DB_SYNC=false` en producción para evitar que TypeORM modifique el schema automáticamente
- Si cambias el schema, debes ejecutar migraciones manualmente

### 4. Deploy

Click en **"Create Web Service"** y espera a que termine el deploy.

---

## 🔍 Verificar el Deploy

### Check 1: Logs del Build

En la pestaña **"Logs"**, deberías ver:

```
==> Building...
==> Running build command 'npm install && npm run build'...
✔ Dependencies installed
✔ Build succeeded
==> Starting server...
[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG [NestApplication] Nest application successfully started
```

### Check 2: Health Check

Una vez desplegado, tu API estará disponible en:
```
https://tractores-api.onrender.com
```

Prueba con:
```bash
curl https://tractores-api.onrender.com/api/v1/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@transporte.com","password":"admin123"}'
```

Deberías recibir un token JWT.

---

## 🐛 Troubleshooting

### Error: "nest: not found"

**Problema**: El comando `nest` no se encuentra durante el build.

**Solución**: Asegúrate de que el Build Command sea:
```bash
npm install && npm run build
```

NO uses `npm ci` ni `npm install --production` porque necesitas las devDependencies para hacer el build.

### Error: "Cannot connect to database"

**Problema**: No puede conectarse a Supabase.

**Soluciones**:
1. Verifica que `DATABASE_URL` esté correcta en las variables de entorno
2. Asegúrate de usar el **Transaction Pooler** (puerto 6543) no el directo (puerto 5432)
3. Verifica que `ssl: { rejectUnauthorized: false }` esté en el código

### Error: "Port already in use"

**Problema**: El puerto está ocupado.

**Solución**: Render asigna automáticamente el puerto via la variable `PORT`. Asegúrate de que tu `main.ts` use:
```typescript
const port = process.env.PORT || 3000;
await app.listen(port);
```

### Logs de Error

Si ves errores en los logs de Render:

1. Ve a la pestaña **"Logs"**
2. Busca mensajes de error en rojo
3. Los errores más comunes:
   - Problemas de conexión a DB
   - Variables de entorno faltantes
   - Errores de TypeScript no compilados

---

## 🔄 Redeploy / Actualizar

### Deploy Automático

Si configuraste **Auto-Deploy: Yes**, cada push a `master` desplegará automáticamente.

```bash
git add .
git commit -m "Update: descripción del cambio"
git push origin master
```

Render detectará el push y hará redeploy automáticamente.

### Deploy Manual

1. Ve a tu servicio en Render
2. Click en **"Manual Deploy"** → **"Deploy latest commit"**

---

## 📊 Monitoreo

### Métricas en Render

Render proporciona:
- **CPU Usage**: Uso de CPU
- **Memory**: Uso de memoria
- **Response Time**: Tiempo de respuesta
- **Request Rate**: Requests por segundo

### Logs

Para ver logs en tiempo real:
1. Ve a la pestaña **"Logs"**
2. Los logs se actualizan automáticamente

### Alertas

Configura alertas para:
- Deploy fallidos
- Uso alto de recursos
- Errores 5xx

---

## 🔐 Seguridad

### Variables de Entorno

**⚠️ NUNCA** commits el archivo `.env` al repositorio.

El `.gitignore` ya incluye:
```
.env
.env.*
```

### Cambiar Contraseña de Supabase

Después del deploy, considera cambiar la contraseña de Supabase:

1. Ve a Supabase Dashboard
2. Settings → Database
3. Generate new password
4. Actualiza `DATABASE_URL` en Render
5. Redeploy

### JWT Secret

Para producción, genera un JWT secret más seguro:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Actualiza `JWT_SECRET` en Render.

---

## 🌐 Dominio Personalizado

### Agregar Dominio

1. Ve a tu servicio en Render
2. Click en **"Settings"** → **"Custom Domains"**
3. Click **"Add Custom Domain"**
4. Ingresa tu dominio: `api.tudominio.com`

### Configurar DNS

En tu proveedor de dominio (GoDaddy, Namecheap, etc.):

**Opción 1: CNAME (Recomendado)**
```
Type: CNAME
Name: api
Value: tractores-api.onrender.com
```

**Opción 2: A Record**
```
Type: A
Name: api
Value: (IP que Render te proporcione)
```

### SSL/HTTPS

Render proporciona SSL gratuito automáticamente. Una vez que el dominio esté configurado, HTTPS funcionará en minutos.

---

## 💰 Costos

### Plan Free

- ✅ **Gratis**
- ⚠️ Se duerme después de 15 minutos de inactividad
- ⚠️ 750 horas/mes de uso
- ⚠️ Cold start de ~30 segundos

### Plan Starter ($7/mes)

- ✅ Siempre activo (no se duerme)
- ✅ Sin cold starts
- ✅ 512 MB RAM
- ✅ Mejor para producción

---

## 📱 Conectar el Frontend

Una vez que tu API esté desplegada, actualiza el frontend:

### React Native

En `src/config/api.js`:

```javascript
// Para desarrollo local
// export const API_URL = 'http://192.168.0.23:3000/api/v1';

// Para producción (Render)
export const API_URL = 'https://tractores-api.onrender.com/api/v1';
```

### Variables de Entorno en Frontend

Usa diferentes URLs según el ambiente:

```javascript
const isDevelopment = __DEV__;

export const API_URL = isDevelopment
  ? 'http://192.168.0.23:3000/api/v1'
  : 'https://tractores-api.onrender.com/api/v1';
```

---

## 🔧 Mantenimiento

### Backup de Base de Datos

Supabase hace backups automáticos, pero puedes hacer backups manuales:

1. Ve a Supabase Dashboard
2. Database → Backups
3. Download backup

### Monitorear Uso de Supabase

1. Ve a Supabase Dashboard
2. Settings → Usage
3. Verifica que no excedas el plan gratuito:
   - Database size: 500 MB
   - Bandwidth: 2 GB
   - Row Limit: 50,000 rows

### Logs de Aplicación

Para debug en producción, los logs de NestJS aparecen en Render Logs.

---

## ✅ Checklist de Deploy

Antes de hacer deploy, verifica:

- [ ] ✅ Código en GitHub actualizado
- [ ] ✅ Base de datos Supabase funcionando
- [ ] ✅ Usuario admin creado en Supabase
- [ ] ✅ `.env` en `.gitignore` (no commitear)
- [ ] ✅ `DB_SYNC=false` en variables de Render
- [ ] ✅ Build command: `npm install && npm run build`
- [ ] ✅ Start command: `npm run start:prod`
- [ ] ✅ Variables de entorno configuradas en Render
- [ ] ✅ Probar login después del deploy

---

## 📞 URLs Importantes

- **Render Dashboard**: https://dashboard.render.com
- **Supabase Dashboard**: https://supabase.com/dashboard/project/mkthvbllpccrsanuyrlk
- **Repositorio GitHub**: https://github.com/leontwas/transportes-api

---

## 🎯 Siguiente Paso

Después del deploy exitoso:
1. ✅ Probar todos los endpoints
2. ✅ Crear datos de prueba (choferes, tractores, bateas)
3. ✅ Conectar el frontend a la API en producción
4. ✅ Probar flujo completo desde la app móvil

---

**Última Actualización**: 12 de enero de 2026
**Estado**: Listo para deploy