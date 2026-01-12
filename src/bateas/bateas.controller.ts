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
import { BateasService } from './bateas.service';
import { EstadoBatea } from '../entities/batea.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RolUsuario } from '../entities/usuario.entity';

@Controller('api/v1/bateas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN)
export class BateasController {
  constructor(private readonly bateasService: BateasService) { }

  @Get()
  @Roles(RolUsuario.ADMIN)
  async obtenerTodos(@Query('estado') estado?: EstadoBatea) {
    return this.bateasService.obtenerTodos(estado);
  }

  @Get(':batea_id')
  async obtenerPorId(@Param('batea_id', ParseIntPipe) batea_id: number) {
    return this.bateasService.obtenerPorId(batea_id);
  }

  @Post()
  async crear(
    @Body()
    createBateaDto: {
      batea_id: string;
      marca: string;
      modelo: string;
      patente: string;
      seguro?: string;
      carga_max_batea: number;
      estado?: EstadoBatea;
    },
  ) {
    return this.bateasService.crear(createBateaDto);
  }

  @Patch(':batea_id')
  async actualizar(
    @Param('batea_id', ParseIntPipe) batea_id: number,
    @Body()
    updateBateaDto: {
      marca?: string;
      modelo?: string;
      patente?: string;
      seguro?: string;
      carga_max_batea?: number;
      estado?: EstadoBatea;
      chofer_id?: number;
      tractor_id?: number;
    },
  ) {
    return this.bateasService.actualizar(batea_id, updateBateaDto);
  }

  @Delete(':batea_id')
  async eliminar(@Param('batea_id', ParseIntPipe) batea_id: number) {
    return this.bateasService.eliminar(batea_id);
  }

  @Patch(':batea_id/estado')
  async cambiarEstado(
    @Param('batea_id', ParseIntPipe) batea_id: number,
    @Body() body: { estado: EstadoBatea },
  ) {
    return this.bateasService.cambiarEstado(batea_id, body.estado);
  }

  @Patch(':batea_id/chofer/:chofer_id')
  async asignarChofer(
    @Param('batea_id', ParseIntPipe) batea_id: number,
    @Param('chofer_id', ParseIntPipe) chofer_id: number,
  ) {
    return this.bateasService.asignarChofer(batea_id, chofer_id);
  }

  @Patch(':batea_id/tractor/:tractor_id')
  async asignarTractor(
    @Param('batea_id', ParseIntPipe) batea_id: number,
    @Param('tractor_id', ParseIntPipe) tractor_id: number,
  ) {
    return this.bateasService.asignarTractor(batea_id, tractor_id);
  }
}
