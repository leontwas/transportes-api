import { Controller, Get, Post, Body, Param, Delete, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { ViajesService } from './viajes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RolUsuario } from '../entities/usuario.entity';

@Controller('api/v1/viajes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ViajesController {
    constructor(private readonly viajesService: ViajesService) { }

    @Delete(':id_viaje')
    @Roles(RolUsuario.ADMIN)
    async eliminar(
        @Param('id_viaje', ParseIntPipe) id_viaje: number,
        @Request() req
    ) {
        return this.viajesService.eliminar(id_viaje, req.user);
    }

    @Get()
    @Roles(RolUsuario.ADMIN, RolUsuario.CHOFER)
    async obtenerTodos(@Request() req) {
        return this.viajesService.obtenerTodos(req.user);
    }

    @Get(':id_viaje')
    @Roles(RolUsuario.ADMIN, RolUsuario.CHOFER)
    async obtenerPorId(@Param('id_viaje', ParseIntPipe) id_viaje: number, @Request() req) {
        return this.viajesService.obtenerPorId(id_viaje, req.user);
    }

    @Post()
    @Roles(RolUsuario.ADMIN)
    async crear(
        @Body()
        body: {
            chofer_id: number;
            tractor_id: number;
            batea_id: number;
            origen: string;
            destino: string;
            fecha_salida: Date;
            numero_remito?: string;
            toneladas_cargadas?: number;
        },
    ) {
        return this.viajesService.crear(body);
    }
}
