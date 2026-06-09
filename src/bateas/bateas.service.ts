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
import { EstadoChofer } from '../entities/chofer.entity';

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
    marca?: string;
    modelo?: string;
    patente: string;
    seguro?: string;
    transportista?: string;
    carga_max_batea: number;
    chofer_id?: number | string;
    tractor_id?: number | string;
  }) {
    const choferId = data.chofer_id ? Number(data.chofer_id) : null;
    const tractorId = data.tractor_id ? Number(data.tractor_id) : null;

    const existente = await this.bateaRepository.findOne({
      where: { patente: data.patente }, // Usar patente como unique key
    });

    if (existente) {
      throw new BadRequestException(`Patente ${data.patente} ya existe`);
    }

    // Usar transacción para guardar de forma bidireccional
    return this.bateaRepository.manager.transaction(async (manager) => {
      const dataToSave = { ...data };
      if (choferId !== null) dataToSave.chofer_id = choferId;
      if (tractorId !== null) dataToSave.tractor_id = tractorId;

      const batea = manager.create(Batea, dataToSave as any);
      const savedBatea = await manager.save(Batea, batea);
      const bateaId = savedBatea.batea_id;

      if (choferId) {
        // Actualizar chofer
        await manager.query(
          'UPDATE choferes SET batea_id = $1 WHERE id_chofer = $2',
          [bateaId, choferId]
        );
        // Si tiene chofer asignado, marcar estado como CARGADO
        await manager.update(Batea, { batea_id: bateaId }, { estado: EstadoBatea.CARGADO });
        savedBatea.estado = EstadoBatea.CARGADO;
      }

      if (tractorId) {
        // Actualizar tractor
        await manager.query(
          'UPDATE tractores SET batea_id = $1 WHERE tractor_id = $2',
          [bateaId, tractorId]
        );
      }

      return savedBatea;
    });
  }

  async actualizar(
    batea_id: number,
    data: {
      marca?: string;
      modelo?: string;
      patente?: string;
      seguro?: string;
      transportista?: string;
      estado?: EstadoBatea;
      carga_max_batea?: number;
      chofer_id?: number | string;
      tractor_id?: number | string;
    },
  ) {
    if (data.chofer_id !== undefined && data.chofer_id !== null) {
      data.chofer_id = Number(data.chofer_id);
    }
    if (data.tractor_id !== undefined && data.tractor_id !== null) {
      data.tractor_id = Number(data.tractor_id);
    }

    await this.obtenerPorId(batea_id);

    // Si se está intentando cambiar chofer o tractor, validar que el chofer actual no esté activo
    if (data.chofer_id !== undefined || data.tractor_id !== undefined) {
      const batea = await this.obtenerPorId(batea_id);
      if (batea.chofer_id) {
        const chofer = await this.bateaRepository.manager.query(
          'SELECT id_chofer, estado_chofer FROM choferes WHERE id_chofer = $1',
          [batea.chofer_id],
        );
        if (chofer && chofer.length > 0) {
          const estadosActivos = [
            EstadoChofer.CARGANDO,
            EstadoChofer.VIAJANDO,
            EstadoChofer.DESCANSANDO,
            EstadoChofer.DESCARGANDO,
            EstadoChofer.ENTREGA_FINALIZADA,
          ];
          if (estadosActivos.includes(chofer[0].estado_chofer)) {
            throw new BadRequestException('No es posible modificar los recursos de un chofer con jornada activa.');
          }
        }
      }
    }

    // Si se está asignando un chofer, usar el método con validaciones
    if (data.chofer_id !== undefined) {
      const choferId = data.chofer_id;
      delete data.chofer_id; // Remover del objeto data

      // Actualizar campos básicos primero si los hay
      if (Object.keys(data).length > 0) {
        await this.bateaRepository.update({ batea_id }, data as any);
      }

      // Si chofer_id es null, limpiar la asignación bidireccionalmente y poner VACIO
      if (choferId === null) {
        await this.bateaRepository.manager.transaction(async (manager) => {
          // Limpiar chofer_id de la batea y poner VACIO
          await manager.query(
            'UPDATE bateas SET chofer_id = NULL, estado = $1 WHERE batea_id = $2',
            ['vacio', batea_id],
          );
          // Limpiar batea_id del chofer
          await manager.query(
            'UPDATE choferes SET batea_id = NULL WHERE batea_id = $1',
            [batea_id],
          );
        });
        this.logger.log(`✓ Chofer removido de batea ${batea_id} → estado VACIO`);
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
        await this.bateaRepository.update({ batea_id }, data as any);
      }

      // Si tractor_id es null, limpiar la asignación bidireccionalmente
      if (tractorId === null) {
        await this.bateaRepository.manager.transaction(async (manager) => {
          // Limpiar tractor_id de la batea
          await manager.query(
            'UPDATE bateas SET tractor_id = NULL WHERE batea_id = $1',
            [batea_id],
          );
          // Limpiar batea_id del tractor
          await manager.query(
            'UPDATE tractores SET batea_id = NULL WHERE batea_id = $1',
            [batea_id],
          );
        });
        this.logger.log(`✓ Tractor removido de batea ${batea_id} y tractor actualizado`);
      } else {
        // Usar el método con validaciones
        return this.asignarTractor(batea_id, tractorId);
      }

      return this.obtenerPorId(batea_id);
    }

    // Si no hay asignaciones, actualizar normalmente
    await this.bateaRepository.update({ batea_id }, data as any);
    this.logger.log(`✓ Batea ${batea_id} actualizada`);
    return this.obtenerPorId(batea_id);
  }

  async eliminar(batea_id: number) {
    // Verificar que existe
    await this.obtenerPorId(batea_id);

    try {
      // Eliminar directamente sin cargar relaciones
      await this.bateaRepository.delete({ batea_id });
      this.logger.log(`✓ Batea ${batea_id} eliminada`);
      return { mensaje: `Batea ${batea_id} eliminada` };
    } catch (error: any) {
      if (error.code === '23503') {
        throw new ConflictException('No se puede eliminar la batea porque está actualmente asignada a un chofer, un tractor o está registrada en un viaje. Desvincúlala primero antes de eliminarla.');
      }
      throw error;
    }
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

    const estadosActivos = [
      EstadoChofer.CARGANDO,
      EstadoChofer.VIAJANDO,
      EstadoChofer.DESCANSANDO,
      EstadoChofer.DESCARGANDO,
      EstadoChofer.ENTREGA_FINALIZADA,
    ];

    // Validar si el chofer actual de la batea está activo
    if (batea.chofer_id) {
      const choferActual = await this.bateaRepository.manager.query(
        'SELECT id_chofer, estado_chofer FROM choferes WHERE id_chofer = $1',
        [batea.chofer_id],
      );
      if (choferActual && choferActual.length > 0) {
        if (estadosActivos.includes(choferActual[0].estado_chofer)) {
          throw new BadRequestException('No es posible modificar los recursos de un chofer con jornada activa.');
        }
      }
    }

    // 1. Verificar si el chofer existe
    const chofer = await this.bateaRepository.manager.query(
      'SELECT id_chofer, nombre_completo, batea_id, estado_chofer FROM choferes WHERE id_chofer = $1',
      [chofer_id],
    );

    if (!chofer || chofer.length === 0) {
      throw new NotFoundException(`Chofer con ID ${chofer_id} no encontrado`);
    }

    const choferData = chofer[0];

    // Validar si el nuevo chofer está activo
    if (estadosActivos.includes(choferData.estado_chofer)) {
      throw new BadRequestException('No es posible modificar los recursos de un chofer con jornada activa.');
    }

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

      // Actualizar batea: asignar chofer y marcar OCUPADO siempre
      await manager.update(Batea, { batea_id }, { chofer_id, estado: EstadoBatea.OCUPADO });
    });

    this.logger.log(`✓ Batea ${batea.patente} asignada a chofer ${choferData.nombre_completo} → estado OCUPADO`);
    return this.obtenerPorId(batea_id);
  }

  async asignarTractor(batea_id: number, tractor_id: number) {
    const batea = await this.obtenerPorId(batea_id);

    const estadosActivos = [
      EstadoChofer.CARGANDO,
      EstadoChofer.VIAJANDO,
      EstadoChofer.DESCANSANDO,
      EstadoChofer.DESCARGANDO,
      EstadoChofer.ENTREGA_FINALIZADA,
    ];

    // Validar si el chofer actual de la batea está activo
    if (batea.chofer_id) {
      const choferActual = await this.bateaRepository.manager.query(
        'SELECT id_chofer, estado_chofer FROM choferes WHERE id_chofer = $1',
        [batea.chofer_id],
      );
      if (choferActual && choferActual.length > 0) {
        if (estadosActivos.includes(choferActual[0].estado_chofer)) {
          throw new BadRequestException('No es posible modificar los recursos de un chofer con jornada activa.');
        }
      }
    }

    // 1. Verificar que el tractor existe
    const tractor = await this.bateaRepository.manager.query(
      'SELECT tractor_id, patente, batea_id, chofer_id FROM tractores WHERE tractor_id = $1',
      [tractor_id]
    );

    if (!tractor || tractor.length === 0) {
      throw new NotFoundException(`Tractor con ID ${tractor_id} no encontrado`);
    }

    const tractorData = tractor[0];

    // Validar si el chofer actual del tractor está activo
    if (tractorData.chofer_id) {
      const choferActualTractor = await this.bateaRepository.manager.query(
        'SELECT id_chofer, estado_chofer FROM choferes WHERE id_chofer = $1',
        [tractorData.chofer_id],
      );
      if (choferActualTractor && choferActualTractor.length > 0) {
        if (estadosActivos.includes(choferActualTractor[0].estado_chofer)) {
          throw new BadRequestException('No es posible modificar los recursos de un chofer con jornada activa.');
        }
      }
    }

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

      // Actualizar batea: asignar tractor_id
      await manager.update(Batea, { batea_id }, { tractor_id });

      // Si la batea ya tiene chofer asignado, marcar batea OCUPADO
      if (batea.chofer_id) {
        await manager.update(Batea, { batea_id }, { estado: EstadoBatea.OCUPADO });
      }
    });

    this.logger.log(`✓ Batea ${batea.patente} asignada a tractor ${tractorData.patente}`);
    return this.obtenerPorId(batea_id);
  }
}
