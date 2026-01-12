import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsString({ message: 'El nombre completo debe ser un texto' })
  @MinLength(3, { message: 'El nombre completo debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre completo no puede exceder 100 caracteres' })
  nombre_completo: string;

  @IsEmail({}, { message: 'El email no es válido' })
  @Transform(({ value }) => value.toLowerCase())
  email: string;

  @IsString({ message: 'La contraseña debe ser un texto' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;
}
