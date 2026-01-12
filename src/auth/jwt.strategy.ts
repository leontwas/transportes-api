import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Usuario } from '../entities/usuario.entity';
import {
    InvalidTokenException,
    InactiveUserException,
} from '../common/exceptions/custom-exceptions';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        @InjectRepository(Usuario)
        private usuarioRepository: Repository<Usuario>,
        private configService: ConfigService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'tu_secreto_jwt_super_seguro_cambiar_en_produccion',
        });
    }

    async validate(payload: any) {
        const usuario = await this.usuarioRepository.findOne({
            where: { usuario_id: payload.sub },
            relations: ['chofer'],
        });

        if (!usuario) {
            throw new InvalidTokenException();
        }

        if (!usuario.activo) {
            throw new InactiveUserException();
        }

        return usuario;
    }
}
