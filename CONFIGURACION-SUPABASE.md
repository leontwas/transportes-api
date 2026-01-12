# Configuración de Supabase para Tractores API

**Fecha**: 12 de enero de 2026
**Proyecto Supabase ID**: mkthvbllpccrsanuyrlk

---

## ⚠️ Problema Actual

El servidor no puede resolver el DNS de Supabase:
```
Error: getaddrinfo ENOTFOUND db.mkthvbllpccrsanuyrlk.supabase.co
```

Esto puede deberse a:
1. **La base de datos aún se está inicializando** en Supabase (puede tardar unos minutos)
2. **Problema de DNS local** en tu máquina
3. **Firewall o antivirus** bloqueando la conexión
4. **Cadena de conexión incorrecta**

---

## 📋 Pasos para Obtener la Cadena de Conexión Correcta

### 1. Accede a tu Proyecto Supabase

Ve a: https://supabase.com/dashboard/project/mkthvbllpccrsanuyrlk

### 2. Ve a Database Settings

1. Click en el ícono de **engranaje (Settings)** en el menú lateral izquierdo
2. Click en **"Database"**

### 3. Copia la Connection String

En la sección **"Connection string"**, verás varias opciones:

#### Opción A: Session Mode (Recomendado para TypeORM)
```
URI
postgresql://postgres:[YOUR-PASSWORD]@db.mkthvbllpccrsanuyrlk.supabase.co:5432/postgres
```

#### Opción B: Transaction Mode (Pooler - Para producción con alto tráfico)
```
Transaction
postgresql://postgres.mkthvbllpccrsanuyrlk:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### 4. Reemplaza [YOUR-PASSWORD]

La contraseña es: `leonardolipiejko`

La cadena completa debería verse así:
```
postgresql://postgres:leonardolipiejko@db.mkthvbllpccrsanuyrlk.supabase.co:5432/postgres
```

---

## 🔧 Verificar Estado de la Base de Datos

### Desde el Panel de Supabase

1. Ve a: https://supabase.com/dashboard/project/mkthvbllpccrsanuyrlk
2. Verifica que en la esquina superior derecha diga **"Project is active"** o **"Healthy"**
3. Si dice **"Paused"** o **"Initializing"**, espera a que esté activo

### Probar Conexión Manualmente

Puedes usar un cliente PostgreSQL para probar la conexión:

**Con psql (si lo tienes instalado):**
```bash
psql "postgresql://postgres:leonardolipiejko@db.mkthvbllpccrsanuyrlk.supabase.co:5432/postgres"
```

**Con DBeaver, pgAdmin, o TablePlus:**
- Host: `db.mkthvbllpccrsanuyrlk.supabase.co`
- Port: `5432`
- Database: `postgres`
- Username: `postgres`
- Password: `leonardolipiejko`
- SSL Mode: `require`

---

## 🛠️ Soluciones Alternativas

### Solución 1: Usar IPv4 Público

Si el DNS no funciona, puedes obtener la IP pública:

1. Abre Command Prompt (cmd)
2. Ejecuta:
```cmd
nslookup db.mkthvbllpccrsanuyrlk.supabase.co
```

3. Anota la IP que te devuelve
4. Actualiza el `.env` con la IP en lugar del hostname

### Solución 2: Cambiar DNS

Si el problema es de DNS local:

1. Abre **Panel de Control** → **Red e Internet** → **Centro de redes y recursos compartidos**
2. Click en tu conexión activa → **Propiedades**
3. Selecciona **Protocolo de Internet versión 4 (TCP/IPv4)** → **Propiedades**
4. Selecciona **Usar las siguientes direcciones de servidor DNS:**
   - Servidor DNS preferido: `8.8.8.8` (Google)
   - Servidor DNS alternativo: `1.1.1.1` (Cloudflare)
5. Click **Aceptar** y reinicia el sistema

### Solución 3: Verificar Firewall

**Windows Defender Firewall:**
1. Busca "Firewall de Windows Defender"
2. Click en "Permitir una aplicación a través del firewall"
3. Busca "Node.js" y asegúrate de que esté permitido en redes privadas y públicas

**Antivirus:**
- Si tienes antivirus (Norton, McAfee, Kaspersky, etc.), agregar una excepción para Node.js

---

## 📝 Actualizar el Archivo .env

Una vez que tengas la cadena de conexión correcta y funcional, actualiza el archivo `.env`:

```env
# Supabase Database Connection
DATABASE_URL=postgresql://postgres:leonardolipiejko@db.mkthvbllpccrsanuyrlk.supabase.co:5432/postgres

# Variables individuales (respaldo)
DB_HOST=db.mkthvbllpccrsanuyrlk.supabase.co
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=leonardolipiejko
DB_NAME=postgres

# JWT Configuration
JWT_SECRET=leon447578
JWT_EXPIRATION=24h

# Node Environment
NODE_ENV=production

# Database Sync (usar 'true' solo para crear tablas automáticamente)
DB_SYNC=true
```

---

## 🚀 Iniciar el Servidor

Después de actualizar el `.env`:

```bash
# Detener el servidor actual (Ctrl+C)

# Reiniciar
npm run start:dev
```

**Output esperado si la conexión es exitosa:**
```
[Nest] XXXXX - LOG [TypeOrmModule] TypeOrmModule dependencies initialized
[Nest] XXXXX - LOG [InstanceLoader] TypeOrmCoreModule dependencies initialized
[Nest] XXXXX - LOG [RoutesResolver] ChoferesController {/api/v1/choferes}:
[Nest] XXXXX - LOG [RoutesResolver] TractoresController {/api/v1/tractores}:
...
[Nest] XXXXX - LOG [NestApplication] Nest application successfully started
Application is running on: http://[::1]:3000
```

---

## 📊 Crear el Schema en Supabase

### Opción 1: Sincronización Automática (Desarrollo)

Con `DB_SYNC=true`, TypeORM creará automáticamente las tablas al iniciar.

**Ventajas:**
- Rápido y automático
- No necesitas ejecutar scripts SQL

**Desventajas:**
- Puede perder datos si cambias entities
- No recomendado para producción

### Opción 2: Ejecutar Script SQL Manual (Recomendado)

1. Ve a: https://supabase.com/dashboard/project/mkthvbllpccrsanuyrlk/editor
2. Click en **"SQL Editor"**
3. Copia todo el contenido de `scripts/schema.sql`
4. Pégalo en el editor SQL
5. Click en **"Run"**

Esto creará todas las tablas, tipos ENUM, triggers, y constraints correctamente.

---

## 🔍 Verificar que las Tablas se Crearon

### Desde Supabase Dashboard

1. Ve a: https://supabase.com/dashboard/project/mkthvbllpccrsanuyrlk/editor
2. En el panel izquierdo, deberías ver las siguientes tablas:
   - `bateas`
   - `choferes`
   - `periodos_descanso`
   - `tractores`
   - `usuarios`
   - `viajes`

### Desde el API

Prueba con:
```bash
curl http://localhost:3000/api/v1/choferes
```

Debería devolver `[]` (array vacío) si no hay choferes aún.

---

## 🎯 Próximos Pasos

### 1. Verificar Conexión
- [ ] Esperar a que Supabase esté activo
- [ ] Probar conexión con cliente PostgreSQL
- [ ] Resolver problemas de DNS si persisten

### 2. Crear Schema
- [ ] Ejecutar `scripts/schema.sql` en Supabase SQL Editor
- [ ] O dejar que TypeORM lo haga con `DB_SYNC=true`

### 3. Poblar Datos Iniciales
- [ ] Crear usuario admin
- [ ] Crear choferes de prueba
- [ ] Crear tractores y bateas

### 4. Deploy en Render
- [ ] Crear Web Service en Render
- [ ] Conectar repositorio GitHub
- [ ] Configurar variables de entorno
- [ ] Deploy

---

## 📞 Información de Contacto Supabase

- **Dashboard**: https://supabase.com/dashboard/project/mkthvbllpccrsanuyrlk
- **Project ID**: mkthvbllpccrsanuyrlk
- **Project URL**: https://mkthvbllpccrsanuyrlk.supabase.co
- **Región**: us-east-1 (AWS)

---

## 🔐 Seguridad

### Cambiar Contraseña (Recomendado)

Después de completar la configuración, cambia la contraseña de la base de datos:

1. Ve a: https://supabase.com/dashboard/project/mkthvbllpccrsanuyrlk/settings/database
2. Scroll hasta **"Database password"**
3. Click en **"Generate a new password"** o ingresa una nueva
4. **Guarda la nueva contraseña**
5. Actualiza el `.env` con la nueva contraseña

### Variables de Entorno en Render

Cuando hagas deploy en Render, configura estas variables de entorno:

```
DATABASE_URL=postgresql://postgres:[NEW_PASSWORD]@db.mkthvbllpccrsanuyrlk.supabase.co:5432/postgres
JWT_SECRET=leon447578
JWT_EXPIRATION=24h
NODE_ENV=production
DB_SYNC=false
```

**Importante:** Usar `DB_SYNC=false` en producción para evitar pérdida de datos.

---

**Última Actualización**: 12 de enero de 2026
**Estado**: Esperando resolución de conexión DNS