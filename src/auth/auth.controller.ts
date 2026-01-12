import { Controller, Post, Get, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { Usuario } from '../entities/usuario.entity';

@Controller('api/v1/auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        return this.authService.forgotPassword(forgotPasswordDto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getProfile(@GetUser() user: Usuario) {
        return {
            usuario_id: user.usuario_id,
            email: user.email,
            nombre: user.nombre,
            rol: user.rol,
            chofer_id: user.chofer_id || null,
        };
    }
}
