import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ChoferesService } from './choferes.service';
import { ChoferesSchedulerService } from './choferes-scheduler.service';
import { EstadoChofer } from '../entities/chofer.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RolUsuario } from '../entities/usuario.entity';

@Controller('api/v1/choferes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChoferesController {
  constructor(
    private readonly choferesService: ChoferesService,
    private readonly schedulerService: ChoferesSchedulerService,
  ) { }

  @Get()
  @Roles(RolUsuario.ADMIN)
  async obtenerTodos(@Query('estado') estado?: EstadoChofer) {
    return this.choferesService.obtenerTodos(estado);
  }

  @Get('mi-viaje-activo')
  @Roles(RolUsuario.CHOFER)
  async obtenerMiViajeActivo(@Request() req) {
    return this.choferesService.obtenerViajeActivo(req.user.chofer_id);
  }

  @Get(':id_chofer')
  @Roles(RolUsuario.ADMIN, RolUsuario.CHOFER)
  async obtenerPorId(
    @Param('id_chofer', ParseIntPipe) id_chofer: number,
    @Request() req: any,
  ) {
    // Si el usuario es chofer, solo puede ver sus propios datos
    if (req.user.rol === RolUsuario.CHOFER) {
      if (req.user.chofer_id !== id_chofer) {
        throw new ForbiddenException(
          'Solo puedes consultar tus propios datos',
        );
      }
    }

    // Si es admin, puede ver cualquier chofer
    return this.choferesService.obtenerPorId(id_chofer);
  }

  @Patch('mi-estado')
  async actualizarMiEstado(
    @Request() req,
    @Body()
    body: {
      estado_chofer: EstadoChofer;
      razon_estado?: string;
      fecha_inicio_licencia?: Date;
      fecha_fin_licencia?: Date;
      confirmado?: boolean;
      toneladas_descargadas?: number;
    },
  ) {
    return this.choferesService.actualizarEstadoChofer(
      req.user.chofer_id,
      body.estado_chofer,
      body.razon_estado,
      body.fecha_inicio_licencia,
      body.fecha_fin_licencia,
      body.confirmado,
      body.toneladas_descargadas,
    );

  }

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
      confirmado?: boolean;
      toneladas_descargadas?: number;
    },
  ) {
    // Los admins también deben respetar el flujo obligatorio de estados
    // Pero pueden confirmar explícitamente con confirmado: true
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

  @Post('verificar-estados-vencidos')
  @Roles(RolUsuario.ADMIN)
  async verificarEstadosVencidos() {
    await this.schedulerService.verificarAhora();
    return {
      message: 'Verificación de estados vencidos ejecutada correctamente',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('search/:apellido')
  @Roles(RolUsuario.ADMIN)
  async buscarPorApellido(@Param('apellido') apellido: string) {
    return this.choferesService.buscarPorApellido(apellido);
  }

  @Get('tractor/:tractor_id/disponibilidad/:batea_id')
  @Roles(RolUsuario.ADMIN)
  async verificarDisponibilidad(
    @Param('tractor_id', ParseIntPipe) tractor_id: number,
    @Param('batea_id', ParseIntPipe) batea_id: number,
  ) {
    return this.choferesService.verificarDisponibilidad(tractor_id, batea_id);
  }

  @Post()
  @Roles(RolUsuario.ADMIN)
  async crear(
    @Body()
    createChoferDto: {
      nombre_completo: string;
      estado_chofer?: EstadoChofer;
    },
  ) {
    return this.choferesService.crear(createChoferDto);
  }

  @Patch(':id_chofer')
  @Roles(RolUsuario.ADMIN)
  async actualizar(
    @Param('id_chofer', ParseIntPipe) id_chofer: number,
    @Body()
    updateChoferDto: {
      nombre_completo?: string;
      estado_chofer?: EstadoChofer;
      razon_estado?: string;
      batea_id?: number;
      tractor_id?: number;
    },
  ) {
    return this.choferesService.actualizar(id_chofer, updateChoferDto);
  }

  @Delete(':id_chofer')
  @Roles(RolUsuario.ADMIN)
  async eliminar(@Param('id_chofer', ParseIntPipe) id_chofer: number) {
    return this.choferesService.eliminar(id_chofer);
  }
}
