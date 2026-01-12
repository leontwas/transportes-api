# Implementación: Cambio Automático de Estados Vencidos

**Fecha**: 12 de enero de 2026
**Estado**: ✅ Implementado (requiere restart del servidor)

---

## 📋 Resumen

Se implementó un sistema automático que cambia el estado de los choferes de `FRANCO` o `LICENCIA_ANUAL` a `DISPONIBLE` cuando la `fecha_fin_licencia` vence.

### Problema Resuelto

**Antes:**
- Los choferes quedaban en estado `FRANCO` o `LICENCIA_ANUAL` indefinidamente
- El admin tenía que cambiar manualmente el estado a `DISPONIBLE` cuando terminaba la licencia
- No había sincronización automática con las fechas configuradas

**Después:**
- Sistema automático que verifica cada hora los estados vencidos
- Cambio automático a `DISPONIBLE` cuando `fecha_fin_licencia <= fecha_actual`
- Endpoint manual para verificar estados sin esperar al cron
- Logging completo de todas las actualizaciones

---

## 📝 Cambios Implementados

### 1. Instalación de Dependencias

**Package**: `@nestjs/schedule`

```bash
npm install @nestjs/schedule
```

Este package proporciona la funcionalidad de cron jobs para NestJS.

### 2. Archivo: `src/app.module.ts`

**Agregado**:

```typescript
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    // ... otros imports
    ScheduleModule.forRoot(), // Activar scheduling globalmente
    // ... otros imports
  ],
})
export class AppModule {}
```

### 3. Archivo: `src/choferes/choferes-scheduler.service.ts` (NUEVO)

**Servicio completo**:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Chofer, EstadoChofer } from '../entities/chofer.entity';

@Injectable()
export class ChoferesSchedulerService {
  private readonly logger = new Logger(ChoferesSchedulerService.name);

  constructor(
    @InjectRepository(Chofer)
    private choferRepository: Repository<Chofer>,
  ) {}

  /**
   * Cron Job que se ejecuta cada hora
   * Busca choferes en FRANCO o LICENCIA_ANUAL con fecha_fin_licencia vencida
   * y los cambia automáticamente a DISPONIBLE
   */
  @Cron(CronExpression.EVERY_HOUR)
  async verificarEstadosVencidos() {
    this.logger.log('🔍 Iniciando verificación de estados vencidos...');

    try {
      const ahora = new Date();

      // Buscar choferes con estados vencidos
      const choferesVencidos = await this.choferRepository.find({
        where: [
          {
            estado_chofer: EstadoChofer.FRANCO,
            fecha_fin_licencia: LessThanOrEqual(ahora),
          },
          {
            estado_chofer: EstadoChofer.LICENCIA_ANUAL,
            fecha_fin_licencia: LessThanOrEqual(ahora),
          },
        ],
      });

      if (choferesVencidos.length === 0) {
        this.logger.log('✓ No hay estados vencidos para actualizar');
        return;
      }

      this.logger.log(
        `📋 Encontrados ${choferesVencidos.length} chofer(es) con estados vencidos`,
      );

      // Actualizar cada chofer a DISPONIBLE
      for (const chofer of choferesVencidos) {
        const estadoAnterior = chofer.estado_chofer;

        await this.choferRepository.update(
          { id_chofer: chofer.id_chofer },
          {
            estado_chofer: EstadoChofer.DISPONIBLE,
            razon_estado: `Cambio automático: ${estadoAnterior} finalizado`,
            fecha_inicio_licencia: null,
            fecha_fin_licencia: null,
            ultimo_estado_en: new Date(),
          },
        );

        this.logger.log(
          `✅ Chofer ${chofer.nombre_completo} (ID: ${chofer.id_chofer}): ${estadoAnterior} → DISPONIBLE`,
        );
      }

      this.logger.log(
        `✓ Actualización completa: ${choferesVencidos.length} chofer(es) ahora DISPONIBLE`,
      );
    } catch (error) {
      this.logger.error('❌ Error al verificar estados vencidos:', error.message);
      this.logger.error(error.stack);
    }
  }

  /**
   * Método manual para forzar la verificación (útil para testing)
   */
  async verificarAhora() {
    this.logger.log('🔄 Verificación manual iniciada...');
    await this.verificarEstadosVencidos();
  }
}
```

### 4. Archivo: `src/choferes/choferes.module.ts`

**Modificado**:

```typescript
import { ChoferesSchedulerService } from './choferes-scheduler.service';

@Module({
  imports: [TypeOrmModule.forFeature([Chofer, Viaje])],
  providers: [
    ChoferesService,
    ChoferesSchedulerService, // Agregado
  ],
  controllers: [ChoferesController],
  exports: [ChoferesService],
})
export class ChoferesModule {}
```

### 5. Archivo: `src/choferes/choferes.controller.ts`

**Agregado endpoint manual**:

```typescript
import { ChoferesSchedulerService } from './choferes-scheduler.service';

@Controller('api/v1/choferes')
export class ChoferesController {
  constructor(
    private readonly choferesService: ChoferesService,
    private readonly schedulerService: ChoferesSchedulerService, // Agregado
  ) {}

  // ... otros endpoints

  @Post('verificar-estados-vencidos')
  @Roles(RolUsuario.ADMIN)
  async verificarEstadosVencidos() {
    await this.schedulerService.verificarAhora();
    return {
      message: 'Verificación de estados vencidos ejecutada correctamente',
      timestamp: new Date().toISOString(),
    };
  }
}
```

**Modificado endpoint de estado** (para aceptar `confirmado` del body):

```typescript
@Patch(':id_chofer/estado')
@Roles(RolUsuario.ADMIN)
async actualizarEstado(
  @Param('id_chofer', ParseIntPipe) id_chofer: number,
  @Body()
  body: {
    estado_chofer: EstadoChofer;
    razon_estado?: string;
    fecha_inicio_licencia?: Date;
    fecha_fin_licencia?: Date;
    confirmado?: boolean; // Agregado
    toneladas_descargadas?: number;
  },
) {
  return this.choferesService.actualizarEstadoChofer(
    id_chofer,
    body.estado_chofer,
    body.razon_estado,
    body.fecha_inicio_licencia,
    body.fecha_fin_licencia,
    body.confirmado ?? false, // Usar el valor del body o false por defecto
    body.toneladas_descargadas,
  );
}
```

---

## 🔌 API

### Endpoint: `POST /api/v1/choferes/verificar-estados-vencidos`

Permite ejecutar manualmente la verificación de estados vencidos sin esperar al cron.

**Request:**
```http
POST /api/v1/choferes/verificar-estados-vencidos
Authorization: Bearer <token_admin>
```

**Response (200 OK):**
```json
{
  "message": "Verificación de estados vencidos ejecutada correctamente",
  "timestamp": "2026-01-12T14:30:00.000Z"
}
```

---

## ⚙️ Cron Job

### Configuración

- **Frecuencia**: Cada hora (usando `CronExpression.EVERY_HOUR`)
- **Horario**: Se ejecuta a las 00:00, 01:00, 02:00, ... 23:00
- **Inicio automático**: Sí, al iniciar el servidor

### ¿Cómo funciona?

1. **Cada hora**, el scheduler busca choferes con:
   - `estado_chofer = 'franco' AND fecha_fin_licencia <= NOW()`
   - `estado_chofer = 'licencia_anual' AND fecha_fin_licencia <= NOW()`

2. **Para cada chofer encontrado**:
   - Actualiza `estado_chofer` a `'disponible'`
   - Actualiza `razon_estado` a `'Cambio automático: {estado_anterior} finalizado'`
   - Limpia `fecha_inicio_licencia` y `fecha_fin_licencia` (null)
   - Actualiza `ultimo_estado_en` a la fecha actual

3. **Logging**:
   - Registra en consola cada cambio realizado
   - Muestra el nombre del chofer, ID, y transición de estado
   - Indica el total de choferes actualizados

### Cambiar la Frecuencia

Si quieres cambiar la frecuencia del cron, modifica en `choferes-scheduler.service.ts`:

```typescript
// Cada hora (actual)
@Cron(CronExpression.EVERY_HOUR)

// Cada 30 minutos
@Cron(CronExpression.EVERY_30_MINUTES)

// Cada 10 minutos
@Cron(CronExpression.EVERY_10_MINUTES)

// Cada día a las 6:00 AM
@Cron(CronExpression.EVERY_DAY_AT_6AM)

// Custom (cada 15 minutos)
@Cron('*/15 * * * *')
```

---

## 🚦 Reglas de Negocio

### Estados Afectados

Solo estos dos estados se verifican automáticamente:
- `FRANCO`
- `LICENCIA_ANUAL`

**Otros estados NO son afectados**:
- `DISPONIBLE`
- `CARGANDO`
- `VIAJANDO`
- `DESCANSANDO`
- `DESCARGANDO`
- `ENTREGA_FINALIZADA`
- `EQUIPO_EN_REPARACION`
- `INACTIVO`

### Condición de Vencimiento

Un estado se considera vencido cuando:

```
fecha_fin_licencia <= fecha_actual
```

**Ejemplos**:

```javascript
// HOY: 12 de enero de 2026, 14:00

// ✅ VENCIDO - Se cambiará a DISPONIBLE
fecha_fin_licencia: "2026-01-12T13:59:00.000Z"

// ✅ VENCIDO - Se cambiará a DISPONIBLE
fecha_fin_licencia: "2026-01-11T00:00:00.000Z"

// ❌ NO VENCIDO - NO se cambiará
fecha_fin_licencia: "2026-01-12T14:01:00.000Z"

// ❌ NO VENCIDO - NO se cambiará
fecha_fin_licencia: "2026-01-15T00:00:00.000Z"
```

### Actualización Directa

El scheduler actualiza **directamente en la base de datos**, no a través del servicio `actualizarEstadoChofer`. Esto significa que:

- ✅ **NO** requiere confirmación
- ✅ **NO** valida el flujo de estados
- ✅ **NO** dispara actualizaciones de viajes
- ✅ Es más rápido y eficiente
- ✅ Evita validaciones innecesarias para cambios automáticos

---

## 🧪 Testing

### Script de Prueba: `test-estados-automaticos.js`

**Casos de prueba implementados:**

1. ✅ **FRANCO vencido → DISPONIBLE** - Verificar cambio automático
2. ✅ **LICENCIA_ANUAL vencida → DISPONIBLE** - Verificar cambio automático
3. ✅ **FRANCO NO vencido permanece sin cambios** - Verificar que no cambia antes de tiempo

### Prerequisitos del Test

1. **Servidor en ejecución**:
   ```bash
   npm run start:dev
   ```

2. **Usuario admin creado** (ya existe en el sistema)

3. **Al menos un chofer disponible** (el script lo encuentra automáticamente)

### Ejecutar el Test

```bash
# ⚠️ IMPORTANTE: Reiniciar el servidor antes de ejecutar el test
# Presiona Ctrl+C en la terminal donde corre el servidor, luego:
npm run start:dev

# En otra terminal, ejecutar el test:
node test-estados-automaticos.js
```

**Output esperado:**

```
================================================================================
  TEST: CAMBIO AUTOMÁTICO DE ESTADOS VENCIDOS
================================================================================

🔐 1. Login como Admin...
   ✅ Login admin exitoso

👤 2. Obteniendo chofer disponible...
   ✅ Chofer encontrado: Dasha Lipiejko (ID 11)

🧪 3. TEST: Cambiar chofer a FRANCO con fecha vencida...
   ✅ Chofer cambiado a FRANCO
   📝 Fecha fin: 2026-01-11T00:00:00.000Z (VENCIDA)

🔍 4. Verificar estado actual antes del scheduler...
   📋 Estado actual: franco

⚙️  5. Ejecutando scheduler manualmente...
   ✅ Scheduler ejecutado

🔍 6. Verificar estado después del scheduler...
   📋 Estado actual: disponible

🧪 7. TEST: Cambiar chofer a LICENCIA_ANUAL con fecha vencida...
   ✅ Chofer cambiado a LICENCIA_ANUAL
   📝 Fecha fin: 2026-01-12T13:00:00.000Z (VENCIDA)

🔍 4. Verificar estado actual antes del scheduler...
   📋 Estado actual: licencia_anual

⚙️  5. Ejecutando scheduler manualmente...
   ✅ Scheduler ejecutado

🔍 6. Verificar estado después del scheduler...
   📋 Estado actual: disponible

🧪 8. TEST: Cambiar chofer a FRANCO con fecha NO vencida...
   ✅ Chofer cambiado a FRANCO
   📝 Fecha fin: 2026-01-19T14:00:00.000Z (NO VENCIDA)
   ✅ Estado NO cambió (correcto, fecha no vencida)

================================================================================
  RESUMEN DE RESULTADOS
================================================================================

  1. ✅ FRANCO vencido → DISPONIBLE automáticamente
  2. ✅ LICENCIA_ANUAL vencida → DISPONIBLE automáticamente
  3. ✅ FRANCO NO vencido permanece sin cambios

  🎉 TODOS LOS TESTS PASARON EXITOSAMENTE

  ℹ️  El scheduler se ejecuta automáticamente cada hora
  ℹ️  También puedes ejecutarlo manualmente: POST /choferes/verificar-estados-vencidos
================================================================================
```

---

## 📊 Logs del Servidor

### Cuando el Cron se Ejecuta Automáticamente

```
[ChoferesSchedulerService] 🔍 Iniciando verificación de estados vencidos...
[ChoferesSchedulerService] 📋 Encontrados 2 chofer(es) con estados vencidos
[ChoferesSchedulerService] ✅ Chofer Carlos Andrada (ID: 1): franco → DISPONIBLE
[ChoferesSchedulerService] ✅ Chofer María González (ID: 5): licencia_anual → DISPONIBLE
[ChoferesSchedulerService] ✓ Actualización completa: 2 chofer(es) ahora DISPONIBLE
```

### Cuando NO Hay Estados Vencidos

```
[ChoferesSchedulerService] 🔍 Iniciando verificación de estados vencidos...
[ChoferesSchedulerService] ✓ No hay estados vencidos para actualizar
```

### Cuando Hay un Error

```
[ChoferesSchedulerService] 🔍 Iniciando verificación de estados vencidos...
[ChoferesSchedulerService] ❌ Error al verificar estados vencidos: Connection timeout
[ChoferesSchedulerService] Error stack trace...
```

---

## 🎯 Uso en el Frontend

### Al Establecer Franco/Licencia Anual

Cuando el admin o chofer establece un estado con fecha de fin:

```javascript
// services/choferService.js
export const establecerFranco = async (choferId, fechaInicio, fechaFin, razon) => {
  const token = await AsyncStorage.getItem('token');

  await axios.patch(
    `${API_URL}/choferes/${choferId}/estado`,
    {
      estado_chofer: 'franco',
      fecha_inicio_licencia: fechaInicio,
      fecha_fin_licencia: fechaFin, // ⚠️ Esta fecha determina cuándo vuelve a DISPONIBLE
      razon_estado: razon,
      confirmado: true,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};
```

### Mostrar Tiempo Restante

```javascript
// components/EstadoChoferBadge.jsx
const calcularTiempoRestante = (fechaFin) => {
  const ahora = new Date();
  const fin = new Date(fechaFin);
  const diff = fin - ahora;

  if (diff <= 0) return "Vencido";

  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (dias > 0) return `${dias}d ${horas}h restantes`;
  return `${horas}h restantes`;
};

// En el componente
{chofer.estado_chofer === 'franco' && chofer.fecha_fin_licencia && (
  <Text style={styles.tiempoRestante}>
    {calcularTiempoRestante(chofer.fecha_fin_licencia)}
  </Text>
)}
```

### Notificación de Cambio Automático

Cuando el chofer vuelve de su licencia, el sistema ya lo habrá cambiado a DISPONIBLE:

```javascript
// screens/HomeScreen.jsx
const { viaje, chofer } = useChoferContext();

useEffect(() => {
  if (chofer.estado_chofer === 'disponible' &&
      chofer.razon_estado?.includes('Cambio automático')) {
    Alert.alert(
      'Bienvenido de Vuelta',
      'Tu licencia ha finalizado. Ya estás disponible para viajes.',
      [{ text: 'OK' }]
    );
  }
}, [chofer]);
```

---

## 🔒 Seguridad

### Endpoint Manual

- ✅ Solo accesible por usuarios con rol `ADMIN`
- ✅ Requiere autenticación JWT
- ✅ No acepta parámetros del cliente (previene manipulación)

### Cron Job

- ✅ Se ejecuta en el servidor, no depende del cliente
- ✅ No puede ser desactivado por usuarios
- ✅ Actualiza directamente la base de datos
- ✅ Logging completo para auditoría

---

## 📄 Archivos Modificados/Creados

### Nuevos Archivos

1. **`src/choferes/choferes-scheduler.service.ts`**
   - Servicio con cron job y método manual

2. **`test-estados-automaticos.js`**
   - Script de testing completo

3. **`IMPLEMENTACION-ESTADOS-AUTOMATICOS.md`**
   - Este documento de documentación

### Archivos Modificados

1. **`src/app.module.ts`**
   - Agregado `ScheduleModule.forRoot()`

2. **`src/choferes/choferes.module.ts`**
   - Agregado `ChoferesSchedulerService` a providers

3. **`src/choferes/choferes.controller.ts`**
   - Agregado endpoint `POST verificar-estados-vencidos`
   - Modificado endpoint `PATCH :id_chofer/estado` para aceptar `confirmado`

4. **`package.json`** (automático)
   - Agregado `@nestjs/schedule` a dependencies

---

## ✅ Checklist de Implementación

### Backend (✅ Completado)
- [x] Instalar @nestjs/schedule
- [x] Activar ScheduleModule en app.module
- [x] Crear ChoferesSchedulerService
- [x] Implementar cron job con EVERY_HOUR
- [x] Implementar método manual verificarAhora()
- [x] Agregar servicio a choferes.module
- [x] Crear endpoint POST verificar-estados-vencidos
- [x] Modificar controller para aceptar confirmado
- [x] Logging completo
- [x] Tests creados
- [x] Documentación completa

### Frontend (📝 Por Implementar)
- [ ] Mostrar tiempo restante cuando está en FRANCO/LICENCIA_ANUAL
- [ ] Notificación cuando el estado cambia automáticamente
- [ ] Validación de fechas al establecer licencia
- [ ] Mensaje informativo sobre cambio automático

---

## 🔄 Próximos Pasos

### Para Ejecutar el Test

**⚠️ IMPORTANTE**: Debes reiniciar el servidor antes de ejecutar el test porque se modificó el controller.

```bash
# 1. Detener el servidor actual (Ctrl+C)

# 2. Reiniciar el servidor
npm run start:dev

# 3. En otra terminal, ejecutar el test
node test-estados-automaticos.js
```

### Para el Frontend

1. Agregar indicador visual de tiempo restante
2. Notificación push cuando vuelve a DISPONIBLE (opcional)
3. Calendario para seleccionar fechas de licencia
4. Validación para que `fecha_fin > fecha_inicio`

### Monitoreo en Producción

1. Configurar alertas si el cron falla
2. Dashboard para ver histórico de cambios automáticos
3. Métricas: cuántos choferes cambian automáticamente por día

---

## 📞 Endpoints Disponibles

### Verificación Manual
```
POST http://192.168.0.146:3000/api/v1/choferes/verificar-estados-vencidos
Authorization: Bearer <token_admin>
```

### Establecer Estado con Fecha
```
PATCH http://192.168.0.146:3000/api/v1/choferes/:id_chofer/estado
Authorization: Bearer <token_admin>
Content-Type: application/json

{
  "estado_chofer": "franco",
  "fecha_inicio_licencia": "2026-01-12T00:00:00.000Z",
  "fecha_fin_licencia": "2026-01-20T00:00:00.000Z",
  "razon_estado": "Vacaciones",
  "confirmado": true
}
```

---

**Implementación completada exitosamente** ✅
**Fecha**: 12 de enero de 2026
**Probado**: Pendiente (requiere reiniciar servidor)
**Documentado**: Sí, completamente