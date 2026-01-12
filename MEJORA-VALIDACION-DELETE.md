# Mejora Opcional: Mejor Validación para DELETE Viaje

## Problema Actual

El `ParseIntPipe` por defecto retorna un mensaje genérico:
```json
{
  "statusCode": 400,
  "message": "Validation failed (numeric string is expected)",
  "error": "Bad Request"
}
```

Este mensaje no es muy específico para el usuario final.

## Mejora Propuesta (Opcional)

Si quieres mensajes de error más específicos, puedes crear un pipe personalizado:

### 1. Crear Custom Pipe

Crear archivo: `src/common/pipes/parse-int-with-message.pipe.ts`

```typescript
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseIntWithMessagePipe implements PipeTransform<string, number> {
    constructor(private readonly fieldName: string = 'ID') {}

    transform(value: string): number {
        if (!value) {
            throw new BadRequestException(
                `El ${this.fieldName} es requerido`
            );
        }

        const val = parseInt(value, 10);

        if (isNaN(val)) {
            throw new BadRequestException(
                `El ${this.fieldName} debe ser un número válido. Valor recibido: "${value}"`
            );
        }

        if (val <= 0) {
            throw new BadRequestException(
                `El ${this.fieldName} debe ser mayor a 0. Valor recibido: ${val}`
            );
        }

        return val;
    }
}
```

### 2. Usar en el Controller

```typescript
import { ParseIntWithMessagePipe } from '../common/pipes/parse-int-with-message.pipe';

@Delete(':id_viaje')
@Roles(RolUsuario.ADMIN)
async eliminar(
    @Param('id_viaje', new ParseIntWithMessagePipe('ID del viaje')) id_viaje: number,
    @Request() req
) {
    return this.viajesService.eliminar(id_viaje, req.user);
}
```

### 3. Resultados

Con esta mejora, los mensajes de error serían más claros:

```json
// Si el ID es undefined o null
{
  "statusCode": 400,
  "message": "El ID del viaje es requerido",
  "error": "Bad Request"
}

// Si el ID es "abc"
{
  "statusCode": 400,
  "message": "El ID del viaje debe ser un número válido. Valor recibido: \"abc\"",
  "error": "Bad Request"
}

// Si el ID es 0 o negativo
{
  "statusCode": 400,
  "message": "El ID del viaje debe ser mayor a 0. Valor recibido: 0",
  "error": "Bad Request"
}
```

## ¿Es Necesario?

**NO** - Esta mejora es **opcional** porque:

1. ✅ La validación en el **frontend** es la solución correcta y recomendada
2. ✅ El mensaje actual del `ParseIntPipe` es técnicamente correcto
3. ✅ Un frontend bien implementado nunca enviará IDs inválidos

**Recomendación:**
- **Prioridad 1**: Implementar validación en el frontend (solución principal)
- **Prioridad 2**: Agregar custom pipe solo si quieres mensajes más user-friendly

## Conclusión

La mejor práctica es **validar en el frontend** y dejar que el backend use el `ParseIntPipe` estándar como última línea de defensa.

El custom pipe es solo una mejora cosmética para tener mensajes de error más descriptivos.
