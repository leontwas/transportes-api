import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Batea, EstadoBatea } from '../entities/batea.entity';

@Injectable()
export class BateasService {
  private readonly logger = new Logger(BateasService.name);

  constructor(
    @InjectRepository(Batea)
    private bateaRepository: Repository<Batea>,
  ) {
    this.logger.log('✓ Servicio de Bateas inicializado');
  }

  async obtenerTodos(estado?: EstadoBatea) {
    const where: any = {};
    if (estado) {
      where.estado = estado;
    }
    const bateas = await this.bateaRepository.find({
      where,
      relations: ['tractor', 'chofer'],
      order: { batea_id: 'ASC' },
    });
    this.logger.log(`✓ Obtenidas ${bateas.length} bateas`);
    return bateas;
  }

  async obtenerPorId(batea_id: number) {
    const batea = await this.bateaRepository.findOne({
      where: { batea_id },
      relations: ['tractor', 'chofer'],
    });

    if (!batea) {
      this.logger.warn(`Batea ${batea_id} no encontrada`);
      throw new NotFoundException(`Batea ${batea_id} no encontrada`);
    }
    this.logger.log(`✓ Batea ${batea_id} obtenida`);
    return batea;
  }

  async crear(data: {
    marca: string;
    modelo: string;
    patente: string;
    seguro?: string;
    carga_max_batea: number;
    chofer_id?: number;
    tractor_id?: number;
  }) {
    const existente = await this.bateaRepository.findOne({
      where: { patente: data.patente }, // Usar patente como unique key
    });

    if (existente) {
      throw new BadRequestException(`Patente ${data.patente} ya existe`);
    }

    const batea = this.bateaRepository.create(data);
    return this.bateaRepository.save(batea);
  }

  async actualizar(
    batea_id: number,
    data: {
      marca?: string;
      modelo?: string;
      patente?: string;
      seguro?: string;
      estado?: EstadoBatea;
      carga_max_batea?: number;
      chofer_id?: number;
      tractor_id?: number;
    },
  ) {
    await this.obtenerPorId(batea_id);

    // Si se está asignando un chofer, usar el método con validaciones
    if (data.chofer_id !== undefined) {
      const choferId = data.chofer_id;
      delete data.chofer_id; // Remover del objeto data

      // Actualizar campos básicos primero si los hay
      if (Object.keys(data).length > 0) {
        await this.bateaRepository.update({ batea_id }, data);
      }

      // Si chofer_id es null, limpiar la asignación
      if (choferId === null) {
        await this.bateaRepository.query(
          'UPDATE bateas SET chofer_id = NULL WHERE batea_id = $1',
          [batea_id],
        );
        this.logger.log(`✓ Chofer removido de batea ${batea_id}`);
      } else {
        // Usar el método con validaciones
        return this.asignarChofer(batea_id, choferId);
      }

      return this.obtenerPorId(batea_id);
    }

    // Si se está asignando un tractor, usar el método con validaciones
    if (data.tractor_id !== undefined) {
      const tractorId = data.tractor_id;
      delete data.tractor_id; // Remover del objeto data

      // Actualizar campos básicos primero si los hay
      if (Object.keys(data).length > 0) {
        await this.bateaRepository.update({ batea_id }, data);
      }

      // Si tractor_id es null, limpiar la asignación
      if (tractorId === null) {
        await this.bateaRepository.query(
          'UPDATE bateas SET tractor_id = NULL WHERE batea_id = $1',
          [batea_id],
        );
        this.logger.log(`✓ Tractor removido de batea ${batea_id}`);
      } else {
        // Usar el método con validaciones
        return this.asignarTractor(batea_id, tractorId);
      }

      return this.obtenerPorId(batea_id);
    }

    // Si no hay asignaciones, actualizar normalmente
    await this.bateaRepository.update({ batea_id }, data);
    this.logger.log(`✓ Batea ${batea_id} actualizada`);
    return this.obtenerPorId(batea_id);
  }

  async eliminar(batea_id: number) {
    // Verificar que existe
    await this.obtenerPorId(batea_id);

    // Eliminar directamente sin cargar relaciones
    await this.bateaRepository.delete({ batea_id });

    this.logger.log(`✓ Batea ${batea_id} eliminada`);
    return { mensaje: `Batea ${batea_id} eliminada` };
  }

  async cambiarEstado(batea_id: number, estado: EstadoBatea) {
    const bateaData = await this.obtenerPorId(batea_id);

    if (bateaData.estado === estado) {
      throw new BadRequestException('El estado es el mismo que ya tiene');
    }

    await this.bateaRepository.update({ batea_id }, { estado });

    return this.obtenerPorId(batea_id);
  }

  async asignarChofer(batea_id: number, chofer_id: number) {
    const batea = await this.obtenerPorId(batea_id);

    // 1. Verificar si el chofer existe
    const chofer = await this.bateaRepository.manager.query(
      'SELECT id_chofer, nombre_completo, batea_id FROM choferes WHERE id_chofer = $1',
      [chofer_id],
    );

    if (!chofer || chofer.length === 0) {
      throw new NotFoundException(`Chofer con ID ${chofer_id} no encontrado`);
    }

    const choferData = chofer[0];

    // 2. Verificar que el chofer NO tenga otra batea asignada
    if (choferData.batea_id && choferData.batea_id !== batea_id) {
      const bateaActualChofer = await this.obtenerPorId(choferData.batea_id);
      throw new ConflictException(
        `El chofer ${choferData.nombre_completo} ya tiene asignada la batea con patente ${bateaActualChofer.patente}. ` +
        `Debes desasignar primero esa batea antes de asignar una nueva.`
      );
    }

    // 3. Verificar que la batea NO esté asignada a otro chofer
    const otroChoferConBatea = await this.bateaRepository.manager.query(
      'SELECT id_chofer, nombre_completo FROM choferes WHERE batea_id = $1 AND id_chofer != $2',
      [batea_id, chofer_id]
    );

    if (otroChoferConBatea && otroChoferConBatea.length > 0) {
      throw new ConflictException(
        `La batea con patente ${batea.patente} ya está asignada al chofer ${otroChoferConBatea[0].nombre_completo}. ` +
        `Debes desasignarla primero.`
      );
    }

    // 4. Asignar batea al chofer (Transacción)
    await this.bateaRepository.manager.transaction(async (manager) => {
      // Actualizar chofer
      await manager.query(
        'UPDATE choferes SET batea_id = $1 WHERE id_chofer = $2',
        [batea_id, chofer_id]
      );

      // Actualizar batea
      await manager.update(Batea, { batea_id }, { chofer_id });

      // Actualizar estado si es necesario
      if (batea.estado === EstadoBatea.VACIO) {
        await manager.update(Batea, { batea_id }, { estado: EstadoBatea.CARGADO }); // O el estado que corresponda a 'asignado'
      }
    });

    this.logger.log(`✓ Batea ${batea.patente} asignada a chofer ${choferData.nombre_completo}`);
    return this.obtenerPorId(batea_id);
  }

  async asignarTractor(batea_id: number, tractor_id: number) {
    const batea = await this.obtenerPorId(batea_id);

    // 1. Verificar que el tractor existe
    const tractor = await this.bateaRepository.manager.query(
      'SELECT tractor_id, patente, batea_id FROM tractores WHERE tractor_id = $1',
      [tractor_id]
    );

    if (!tractor || tractor.length === 0) {
      throw new NotFoundException(`Tractor con ID ${tractor_id} no encontrado`);
    }

    const tractorData = tractor[0];

    // 2. Verificar que la batea NO tenga otro tractor asignado
    if (batea.tractor_id && batea.tractor_id !== tractor_id) {
      const tractorActualBatea = await this.bateaRepository.manager.query(
        'SELECT patente FROM tractores WHERE tractor_id = $1',
        [batea.tractor_id]
      );
      throw new ConflictException(
        `La batea con patente ${batea.patente} ya tiene asignado el tractor con patente ${tractorActualBatea[0]?.patente || batea.tractor_id}. ` +
        `Debes desasignar primero ese tractor antes de asignar uno nuevo.`
      );
    }

    // 3. Verificar que el tractor NO esté asignado a otra batea
    const otraBateaConTractor = await this.bateaRepository.findOne({
      where: { tractor_id, batea_id: Not(batea_id) }
    });

    if (otraBateaConTractor) {
      throw new ConflictException(
        `El tractor con patente ${tractorData.patente} ya está asignado a la batea con patente ${otraBateaConTractor.patente}. ` +
        `Debes desasignarlo primero.`
      );
    }

    // 4. Asignar tractor a la batea (Transacción)
    await this.bateaRepository.manager.transaction(async (manager) => {
      // Actualizar tractor
      await manager.query(
        'UPDATE tractores SET batea_id = $1 WHERE tractor_id = $2',
        [batea_id, tractor_id]
      );

      // Actualizar batea
      await manager.update(Batea, { batea_id }, { tractor_id });
    });

    this.logger.log(`✓ Batea ${batea.patente} asignada a tractor ${tractorData.patente}`);
    return this.obtenerPorId(batea_id);
  }
}
