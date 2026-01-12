import { IsEnum, IsOptional, IsString, IsISO8601, IsNumber, IsBoolean } from 'class-validator';
import { EstadoChofer } from '../../entities/chofer.entity';

export class UpdateEstadoChoferDto {
  @IsEnum(EstadoChofer, { message: 'Estado de chofer inválido' })
  estado_chofer: EstadoChofer;

  @IsOptional()
  @IsString({ message: 'La razón del estado debe ser un texto' })
  razon_estado?: string;

  // Para estados que requieren fechas (licencia_anual, franco, equipo_en_reparacion)
  @IsOptional()
  @IsISO8601({}, { message: 'La fecha de inicio debe estar en formato ISO8601' })
  fecha_inicio_licencia?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'La fecha de fin debe estar en formato ISO8601' })
  fecha_fin_licencia?: string;

  // Para el estado DESCARGANDO: capturar toneladas descargadas
  @IsOptional()
  @IsNumber({}, { message: 'Las toneladas descargadas deben ser un número' })
  toneladas_descargadas?: number;

  // Para confirmación de transiciones inusuales
  @IsOptional()
  @IsBoolean({ message: 'El campo confirmado debe ser un booleano' })
  confirmado?: boolean;
}
