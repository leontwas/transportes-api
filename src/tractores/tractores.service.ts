import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Tractor, EstadoTractor } from '../entities/tractor.entity';
import { EstadoChofer } from '../entities/chofer.entity';

@Injectable()
export class TractoresService {
  private readonly logger = new Logger(TractoresService.name);

  constructor(
    @InjectRepository(Tractor)
    private tractorRepository: Repository<Tractor>,
  ) {
    this.logger.log('✓ Servicio de Tractores inicializado');
  }

  async obtenerTodos(estado?: EstadoTractor) {
    const where: any = {};
    if (estado) {
      where.estado_tractor = estado;
    }
    return this.tractorRepository.find({
      where,
      order: { tractor_id: 'ASC' },
    });
  }

  async obtenerPorId(tractor_id: number) {
    const tractor = await this.tractorRepository.findOne({
      where: { tractor_id },
    });

    if (!tractor) {
      throw new NotFoundException(`Tractor ${tractor_id} no encontrado`);
    }
    return tractor;
  }

  async crear(data: {
    marca?: string;
    modelo?: string;
    patente: string;
    seguro?: string;
    transportista?: string;
    carga_max_tractor: number;
    chofer_id?: number | string;
    batea_id?: number | string;
  }) {
    const choferId = data.chofer_id ? Number(data.chofer_id) : null;
    const bateaId = data.batea_id ? Number(data.batea_id) : null;

    const existente = await this.tractorRepository.findOne({
      where: { patente: data.patente }, // Cambio validación ID por Patente, ya que ID es auto
    });

    if (existente) {
      throw new BadRequestException(`Patente ${data.patente} ya existe`);
    }

    // Usar transacción para guardar de forma bidireccional
    return this.tractorRepository.manager.transaction(async (manager) => {
      const dataToSave = { ...data };
      if (choferId !== null) dataToSave.chofer_id = choferId;
      if (bateaId !== null) dataToSave.batea_id = bateaId;

      const tractor = manager.create(Tractor, dataToSave as any);
      const savedTractor = await manager.save(Tractor, tractor);
      const tractorId = savedTractor.tractor_id;

      if (choferId) {
        // Actualizar chofer
        await manager.query(
          'UPDATE choferes SET tractor_id = $1 WHERE id_chofer = $2',
          [tractorId, choferId]
        );
        // Si tiene chofer asignado, marcar estado_tractor como OCUPADO
        await manager.update(Tractor, { tractor_id: tractorId }, { estado_tractor: EstadoTractor.OCUPADO });
        savedTractor.estado_tractor = EstadoTractor.OCUPADO;
      }

      if (bateaId) {
        // Actualizar batea
        await manager.query(
          'UPDATE bateas SET tractor_id = $1 WHERE batea_id = $2',
          [tractorId, bateaId]
        );
      }

      return savedTractor;
    });
  }

  async actualizar(
    tractor_id: number,
    data: {
      marca?: string;
      modelo?: string;
      patente?: string;
      seguro?: string;
      transportista?: string;
      estado_tractor?: EstadoTractor;
      carga_max_tractor?: number;
      chofer_id?: number | string;
      batea_id?: number | string;
    },
  ) {
    if (data.chofer_id !== undefined && data.chofer_id !== null) {
      data.chofer_id = Number(data.chofer_id);
    }
    if (data.batea_id !== undefined && data.batea_id !== null) {
      data.batea_id = Number(data.batea_id);
    }

    await this.obtenerPorId(tractor_id);

    // Si se está intentando cambiar chofer o batea, validar que el chofer actual no esté activo
    if (data.chofer_id !== undefined || data.batea_id !== undefined) {
      const tractor = await this.obtenerPorId(tractor_id);
      if (tractor.chofer_id) {
        const chofer = await this.tractorRepository.manager.query(
          'SELECT id_chofer, estado_chofer FROM choferes WHERE id_chofer = $1',
          [tractor.chofer_id],
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
        await this.tractorRepository.update({ tractor_id }, data as any);
      }

      // Si chofer_id es null, limpiar la asignación bidireccionalmente
      if (choferId === null) {
        await this.tractorRepository.manager.transaction(async (manager) => {
          // Limpiar chofer_id del tractor y poner LIBRE
          await manager.query(
            'UPDATE tractores SET chofer_id = NULL, estado_tractor = $1 WHERE tractor_id = $2',
            ['libre', tractor_id],
          );
          // Limpiar tractor_id del chofer
          await manager.query(
            'UPDATE choferes SET tractor_id = NULL WHERE tractor_id = $1',
            [tractor_id],
          );
        });
        this.logger.log(`✓ Chofer removido de tractor ${tractor_id} → estado LIBRE`);
      } else {
        // Usar el método con validaciones
        return this.asignarChofer(tractor_id, choferId);
      }

      return this.obtenerPorId(tractor_id);
    }

    // Si se está asignando una batea, usar el método con validaciones
    if (data.batea_id !== undefined) {
      const bateaId = data.batea_id;
      delete data.batea_id; // Remover del objeto data

      // Actualizar campos básicos primero si los hay
      if (Object.keys(data).length > 0) {
        await this.tractorRepository.update({ tractor_id }, data as any);
      }

      // Si batea_id es null, limpiar la asignación bidireccionalmente
      if (bateaId === null) {
        await this.tractorRepository.manager.transaction(async (manager) => {
          // Limpiar batea_id del tractor
          await manager.query(
            'UPDATE tractores SET batea_id = NULL WHERE tractor_id = $1',
            [tractor_id],
          );
          // Limpiar tractor_id de la batea
          await manager.query(
            'UPDATE bateas SET tractor_id = NULL WHERE tractor_id = $1',
            [tractor_id],
          );
        });
        this.logger.log(`✓ Batea removida de tractor ${tractor_id} y batea actualizada`);
      } else {
        // Usar el método con validaciones
        return this.asignarBatea(tractor_id, bateaId);
      }

      return this.obtenerPorId(tractor_id);
    }

    // Si no hay asignaciones, actualizar normalmente
    await this.tractorRepository.update({ tractor_id }, data as any);
    this.logger.log(`✓ Tractor ${tractor_id} actualizado`);
    return this.obtenerPorId(tractor_id);
  }

  async eliminar(tractor_id: number) {
    // Verificar que existe
    await this.obtenerPorId(tractor_id);

    try {
      // Eliminar directamente sin cargar relaciones
      await this.tractorRepository.delete({ tractor_id });
      this.logger.log(`✓ Tractor ${tractor_id} eliminado`);
      return { mensaje: `Tractor ${tractor_id} eliminado` };
    } catch (error: any) {
      if (error.code === '23503') {
        throw new ConflictException('No se puede eliminar el tractor porque está actualmente asignado a un chofer, una batea o está registrado en un viaje. Desvincúlalo primero antes de eliminarlo.');
      }
      throw error;
    }
  }

  async cambiarEstado(tractor_id: number, estado_tractor: EstadoTractor) {
    const tractorData = await this.obtenerPorId(tractor_id);

    if (tractorData.estado_tractor === estado_tractor) {
      throw new BadRequestException('El estado es el mismo que ya tiene');
    }

    await this.tractorRepository.update({ tractor_id }, { estado_tractor });

    return this.obtenerPorId(tractor_id);
  }

  async asignarChofer(tractor_id: number, chofer_id: number) {
    const tractor = await this.obtenerPorId(tractor_id);

    const estadosActivos = [
      EstadoChofer.CARGANDO,
      EstadoChofer.VIAJANDO,
      EstadoChofer.DESCANSANDO,
      EstadoChofer.DESCARGANDO,
      EstadoChofer.ENTREGA_FINALIZADA,
    ];

    // Validar si el chofer actual del tractor está activo
    if (tractor.chofer_id) {
      const choferActual = await this.tractorRepository.manager.query(
        'SELECT id_chofer, estado_chofer FROM choferes WHERE id_chofer = $1',
        [tractor.chofer_id],
      );
      if (choferActual && choferActual.length > 0) {
        if (estadosActivos.includes(choferActual[0].estado_chofer)) {
          throw new BadRequestException('No es posible modificar los recursos de un chofer con jornada activa.');
        }
      }
    }

    // 1. Verificar si el chofer existe
    const chofer = await this.tractorRepository.manager.query(
      'SELECT id_chofer, nombre_completo, tractor_id, estado_chofer FROM choferes WHERE id_chofer = $1',
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

    // 2. Verificar que el chofer NO tenga otro tractor asignado
    if (choferData.tractor_id && choferData.tractor_id !== tractor_id) {
      const tractorActualChofer = await this.tractorRepository.findOne({
        where: { tractor_id: choferData.tractor_id },
      });
      throw new ConflictException(
        `El chofer ${choferData.nombre_completo} ya tiene asignado el tractor con patente ${tractorActualChofer?.patente || choferData.tractor_id}. ` +
        `Debes desasignar primero ese tractor antes de asignar uno nuevo.`,
      );
    }

    // 3. Verificar que el tractor NO esté asignado a otro chofer
    const otroChoferConTractor = await this.tractorRepository.manager.query(
      'SELECT id_chofer, nombre_completo FROM choferes WHERE tractor_id = $1 AND id_chofer != $2',
      [tractor_id, chofer_id],
    );

    if (otroChoferConTractor && otroChoferConTractor.length > 0) {
      throw new ConflictException(
        `El tractor con patente ${tractor.patente} ya está asignado al chofer ${otroChoferConTractor[0].nombre_completo}. ` +
        `Debes desasignarlo primero.`,
      );
    }

    // 4. Asignar el tractor al chofer (Transacción)
    await this.tractorRepository.manager.transaction(async (manager) => {
      // Actualizar chofer
      await manager.query(
        'UPDATE choferes SET tractor_id = $1 WHERE id_chofer = $2',
        [tractor_id, chofer_id],
      );

      // Actualizar tractor: asignar chofer y marcar OCUPADO siempre
      await manager.update(Tractor, { tractor_id }, { chofer_id, estado_tractor: EstadoTractor.OCUPADO });
    });

    this.logger.log(`✓ Tractor ${tractor.patente} asignado a chofer ${choferData.nombre_completo} → estado OCUPADO`);
    return this.obtenerPorId(tractor_id);
  }

  async asignarBatea(tractor_id: number, batea_id: number) {
    const tractor = await this.obtenerPorId(tractor_id);

    const estadosActivos = [
      EstadoChofer.CARGANDO,
      EstadoChofer.VIAJANDO,
      EstadoChofer.DESCANSANDO,
      EstadoChofer.DESCARGANDO,
      EstadoChofer.ENTREGA_FINALIZADA,
    ];

    // Validar si el chofer actual del tractor está activo
    if (tractor.chofer_id) {
      const choferActual = await this.tractorRepository.manager.query(
        'SELECT id_chofer, estado_chofer FROM choferes WHERE id_chofer = $1',
        [tractor.chofer_id],
      );
      if (choferActual && choferActual.length > 0) {
        if (estadosActivos.includes(choferActual[0].estado_chofer)) {
          throw new BadRequestException('No es posible modificar los recursos de un chofer con jornada activa.');
        }
      }
    }

    // 1. Verificar si la batea existe
    const batea = await this.tractorRepository.manager.query(
      'SELECT batea_id, patente, tractor_id, estado, chofer_id FROM bateas WHERE batea_id = $1',
      [batea_id],
    );

    if (!batea || batea.length === 0) {
      throw new NotFoundException(`Batea con ID ${batea_id} no encontrada`);
    }

    const bateaData = batea[0];

    // Validar si el chofer actual de la batea está activo
    if (bateaData.chofer_id) {
      const choferActualBatea = await this.tractorRepository.manager.query(
        'SELECT id_chofer, estado_chofer FROM choferes WHERE id_chofer = $1',
        [bateaData.chofer_id],
      );
      if (choferActualBatea && choferActualBatea.length > 0) {
        if (estadosActivos.includes(choferActualBatea[0].estado_chofer)) {
          throw new BadRequestException('No es posible modificar los recursos de un chofer con jornada activa.');
        }
      }
    }

    // 2. Verificar que el tractor NO tenga otra batea asignada
    if (tractor.batea_id && tractor.batea_id !== batea_id) {
      const bateaActualTractor = await this.tractorRepository.manager.query(
        'SELECT patente FROM bateas WHERE batea_id = $1',
        [tractor.batea_id],
      );
      throw new ConflictException(
        `El tractor con patente ${tractor.patente} ya tiene asignada la batea con patente ${bateaActualTractor[0]?.patente || tractor.batea_id}. ` +
        `Debes desasignar primero esa batea antes de asignar una nueva.`,
      );
    }

    // 3. Verificar que la batea NO esté asignada a otro tractor
    const otroTractorConBatea = await this.tractorRepository.findOne({
      where: { batea_id, tractor_id: Not(tractor_id) },
    });

    if (otroTractorConBatea) {
      throw new ConflictException(
        `La batea con patente ${bateaData.patente} ya está asignada al tractor con patente ${otroTractorConBatea.patente}. ` +
        `Debes desasignarla primero.`,
      );
    }

    // 4. Asignar batea al tractor (Transacción)
    await this.tractorRepository.manager.transaction(async (manager) => {
      // Actualizar batea: asignar tractor_id
      await manager.query(
        'UPDATE bateas SET tractor_id = $1 WHERE batea_id = $2',
        [tractor_id, batea_id],
      );

      // Actualizar tractor: asignar batea_id
      await manager.update(Tractor, { tractor_id }, { batea_id });

      // Si la batea ya tiene chofer asignado Y el tractor ya tiene chofer asignado → marcar batea OCUPADO
      const bateaActualizada = await manager.query(
        'SELECT chofer_id FROM bateas WHERE batea_id = $1', [batea_id]
      );
      if (bateaActualizada[0]?.chofer_id && tractor.chofer_id) {
        await manager.query(
          'UPDATE bateas SET estado = $1 WHERE batea_id = $2', ['ocupado', batea_id]
        );
      }
    });

    this.logger.log(`✓ Tractor ${tractor.patente} asignado a batea ${bateaData.patente}`);
    return this.obtenerPorId(tractor_id);
  }
}
