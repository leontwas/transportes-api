import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'El email no es válido' })
  @Transform(({ value }) => value.toLowerCase())
  email: string;
}
