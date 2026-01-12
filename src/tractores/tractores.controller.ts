import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TractoresService } from './tractores.service';
import { EstadoTractor } from '../entities/tractor.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RolUsuario } from '../entities/usuario.entity';

@Controller('api/v1/tractores')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN)
export class TractoresController {
  constructor(private readonly tractoresService: TractoresService) { }

  @Get()
  @Roles(RolUsuario.ADMIN)
  async obtenerTodos(@Query('estado') estado?: EstadoTractor) {
    return this.tractoresService.obtenerTodos(estado);
  }

  @Get(':tractor_id')
  async obtenerPorId(@Param('tractor_id', ParseIntPipe) tractor_id: number) {
    return this.tractoresService.obtenerPorId(tractor_id);
  }

  @Post()
  async crear(
    @Body()
    createTractorDto: {
      marca: string;
      modelo: string;
      patente: string;
      seguro?: string;
      carga_max_tractor: number;
      estado_tractor?: EstadoTractor;
      chofer_id?: number;
      batea_id?: number;
    },
  ) {
    return this.tractoresService.crear(createTractorDto);
  }

  @Patch(':tractor_id')
  async actualizar(
    @Param('tractor_id', ParseIntPipe) tractor_id: number,
    @Body()
    updateTractorDto: {
      marca?: string;
      modelo?: string;
      patente?: string;
      seguro?: string;
      carga_max_tractor?: number;
      estado_tractor?: EstadoTractor;
      chofer_id?: number;
      batea_id?: number;
    },
  ) {
    return this.tractoresService.actualizar(tractor_id, updateTractorDto);
  }

  @Delete(':tractor_id')
  async eliminar(@Param('tractor_id', ParseIntPipe) tractor_id: number) {
    return this.tractoresService.eliminar(tractor_id);
  }

  @Patch(':tractor_id/estado')
  async cambiarEstado(
    @Param('tractor_id', ParseIntPipe) tractor_id: number,
    @Body() body: { estado_tractor: EstadoTractor },
  ) {
    return this.tractoresService.cambiarEstado(tractor_id, body.estado_tractor);
  }

  @Patch(':tractor_id/chofer/:chofer_id')
  async asignarChofer(
    @Param('tractor_id', ParseIntPipe) tractor_id: number,
    @Param('chofer_id', ParseIntPipe) chofer_id: number,
  ) {
    return this.tractoresService.asignarChofer(tractor_id, chofer_id);
  }

  @Patch(':tractor_id/batea/:batea_id')
  async asignarBatea(
    @Param('tractor_id', ParseIntPipe) tractor_id: number,
    @Param('batea_id', ParseIntPipe) batea_id: number,
  ) {
    return this.tractoresService.asignarBatea(tractor_id, batea_id);
  }
}
