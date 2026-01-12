import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Usuario, RolUsuario } from '../entities/usuario.entity';
import { Chofer, EstadoChofer } from '../entities/chofer.entity';
import { MailService } from '../mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(Usuario)
        private usuarioRepository: Repository<Usuario>,
        @InjectRepository(Chofer)
        private choferRepository: Repository<Chofer>,
        private jwtService: JwtService,
        private mailService: MailService,
    ) { }

    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;

        const usuario = await this.usuarioRepository.findOne({
            where: { email },
        });

        if (!usuario) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        if (!usuario.activo) {
            throw new UnauthorizedException('Usuario inactivo');
        }

        const isPasswordValid = await usuario.validatePassword(password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        // Actualizar último login
        usuario.ultimo_login = new Date();
        await this.usuarioRepository.save(usuario);

        const payload = {
            sub: usuario.usuario_id,
            email: usuario.email,
            rol: usuario.rol,
            chofer_id: usuario.chofer_id,
        };

        return {
            access_token: this.jwtService.sign(payload),
            usuario: {
                usuario_id: usuario.usuario_id,
                email: usuario.email,
                nombre: usuario.nombre,
                rol: usuario.rol,
                chofer_id: usuario.chofer_id,
            },
        };
    }

    async register(registerDto: RegisterDto) {
        const { email, password, nombre_completo } = registerDto;

        // Verificar si el email ya está registrado
        const existingUser = await this.usuarioRepository.findOne({
            where: { email },
        });

        if (existingUser) {
            throw new ConflictException('El email ya está registrado');
        }

        // Crear el chofer con estado inactivo
        const nuevoChofer = this.choferRepository.create({
            nombre_completo,
            estado_chofer: EstadoChofer.INACTIVO,
            razon_estado: 'Pendiente de asignación',
        });

        await this.choferRepository.save(nuevoChofer);

        // Crear el usuario con rol chofer y vincularlo al chofer
        const nuevoUsuario = this.usuarioRepository.create({
            email,
            password,
            nombre: nombre_completo,
            rol: RolUsuario.CHOFER,
            chofer_id: nuevoChofer.id_chofer,
            activo: true,
        });

        await this.usuarioRepository.save(nuevoUsuario);

        // Enviar email de bienvenida (no bloqueante)
        this.mailService.sendWelcomeEmail(email, nombre_completo).catch(err => {
            console.error('Error al enviar email de bienvenida:', err);
        });

        // Generar token JWT
        const payload = {
            sub: nuevoUsuario.usuario_id,
            email: nuevoUsuario.email,
            rol: nuevoUsuario.rol,
            chofer_id: nuevoUsuario.chofer_id,
        };

        return {
            access_token: this.jwtService.sign(payload),
            usuario: {
                usuario_id: nuevoUsuario.usuario_id,
                email: nuevoUsuario.email,
                nombre: nuevoUsuario.nombre,
                rol: nuevoUsuario.rol,
                chofer_id: nuevoUsuario.chofer_id,
            },
        };
    }

    async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
        const { email } = forgotPasswordDto;

        const usuario = await this.usuarioRepository.findOne({
            where: { email },
        });

        if (!usuario) {
            throw new UnauthorizedException('No existe un usuario con ese email');
        }

        // IMPORTANTE: Las contraseñas están hasheadas y no se pueden recuperar.
        // Por seguridad, generamos una contraseña temporal y la enviamos por email.
        // El usuario deberá cambiarla después de iniciar sesión.

        // Generar contraseña temporal
        const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();

        // Actualizar la contraseña del usuario
        usuario.password = tempPassword;
        await this.usuarioRepository.save(usuario);

        // Enviar email con la nueva contraseña
        const emailSent = await this.mailService.sendPasswordRecoveryEmail(email, tempPassword);

        if (!emailSent) {
            throw new InternalServerErrorException(
                'No se pudo enviar el email de recuperación. Verifica la configuración de email en el servidor.'
            );
        }

        return {
            mensaje: 'Se ha enviado un correo con tu nueva contraseña temporal',
            email: usuario.email,
        };
    }

    async obtenerPerfil(usuarioId: number) {
        const usuario = await this.usuarioRepository.findOne({
            where: { usuario_id: usuarioId },
        });

        if (!usuario) {
            throw new UnauthorizedException('Usuario no encontrado');
        }

        return {
            usuario_id: usuario.usuario_id,
            email: usuario.email,
            nombre: usuario.nombre,
            rol: usuario.rol,
            activo: usuario.activo,
            ultimo_login: usuario.ultimo_login,
            creado_en: usuario.creado_en,
        };
    }
}
