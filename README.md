<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# Transporte Tractores API

Sistema de gestión logística para administración de Choferes, Tractores, Bateas y Viajes. Desarrollado con **NestJS**, **TypeORM** y **PostgreSQL**.

## 📋 Reglas de Negocio Implementadas

El sistema aplica validaciones estrictas para garantizar la integridad operativa.

### 1. Gestión de Viajes (`/viajes`)
- **Creación de Viajes**:
  - Para iniciar un viaje, se requiere un **Chofer**, un **Tractor** y una **Batea**.
  - **Validaciones Previas**:
    - El Chofer debe estar **ACTIVO** (`activo`).
    - El Tractor debe estar **LIBRE** (`libre`).
    - La Batea debe estar **VACÍA** (`vacio`).
  - **Efectos Automáticos**:
    - Al crear el viaje, el Tractor pasa a estado **OCUPADO**.
    - La Batea pasa a estado **CARGADO**.
- **Finalización/Cancelación**:
  - Al eliminar un viaje (o finalizarlo en el futuro), los recursos se liberan automáticamente (Tractor -> LIBRE, Batea -> VACIO).

### 2. Protección de Recursos y Reasignación
Reglas para evitar conflictos en la asignación de unidades.
- **Chofer Activo**: Si un Chofer está marcado como **ACTIVO**, **NO** se le puede quitar su Tractor o Batea asignada para dárselo a otro. El sistema rechaza la operación para proteger al chofer que está trabajando.
- **Chofer Inactivo**: Si un Chofer está en licencia (`lic_medica`, `vacaciones`, etc.), sus recursos **SÍ** pueden ser reasignados a otro chofer. El sistema desvincula automáticamente al chofer ausente.

### 3. Sincronización Bidireccional
- La relación entre `Chofer`, `Tractor` y `Batea` se mantiene sincronizada automáticamente.
- Asignar un tractor a un chofer actualiza la referencia en ambas entidades.

### 4. Validación de Carga Máxima
- **Límite Dinámico**: Al crear un viaje, el sistema calcula la capacidad operativa máxima como el **MENOR** valor entre la capacidad del Tractor y la capacidad de la Batea.
  - Ej: Tractor (40t) + Batea (35t) -> Solo se permite cargar hasta **35t**.
- El sistema rechaza automáticamente (Error 400) cualquier intento de sobrecarga.

---

## 🚀 Configuración y Ejecución

### Requisitos Previo
- Node.js (v18+)
- PostgreSQL
- Archivo `.env` configurado (ver ejemplo abajo).

### Instalación
```bash
$ npm install
```

### Ejecutar Base de Datos
Asegúrate de tener PostgreSQL corriendo y la base de datos `tractores_db` creada.

### Verificar IP de Red (IMPORTANTE para desarrollo móvil)
```bash
# Verificar tu IP actual y configuración de red
$ npm run check-ip
```

Este comando te mostrará:
- Tu dirección IP actual en la red WiFi
- La URL que debes usar en tu frontend/app móvil
- Estado del servidor (si está corriendo)
- Instrucciones de configuración del firewall si es necesario

**Ejemplo de salida:**
```
📡 Interfaces de red detectadas:
   • Wi-Fi
     IP: 192.168.0.23
     ⭐ PRINCIPAL (usar esta)

🎯 CONFIGURACIÓN RECOMENDADA PARA TU FRONTEND:
   API_URL: http://192.168.0.23:3000
```

### Ejecución del Servidor
```bash
# desarrollo
$ npm run start

# modo watch (recomendado)
$ npm run start:dev
```

**NOTA:** El servidor escucha en `0.0.0.0:3000`, lo que significa que es accesible desde cualquier dispositivo en tu red local. Al iniciar, verás tu IP actual en la consola.

### Scripts de Utilidad (Carpeta `/scripts`)
El proyecto incluye scripts útiles para mantenimiento y pruebas en la carpeta `scripts/`.
- **Limpieza Total**: `node scripts/clean-db.js` (Borra TODOS los datos y reinicia IDs).
- **Pruebas E2E Viajes**: `node scripts/test-e2e-viajes.js`
- **Pruebas E2E Reglas**: `node scripts/test-e2e-proteccion.js`

---

## 🛠️ Stack Tecnológico
- **Framework**: NestJS
- **Base de Datos**: PostgreSQL
- **ORM**: TypeORM
- **Arquitectura**: Modular (Modules, Services, Controllers, Entities)

## Licencia
Nest is [MIT licensed](LICENSE).
