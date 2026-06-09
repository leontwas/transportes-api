import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, EntityManager } from 'typeorm';
import { Batea, EstadoBatea } from '../entities/batea.entity';
import { EstadoChofer } from '../entities/chofer.entity';

@Injectable()
export class BateasService {
  private readonly logger = new Logger(BateasService.name);

  // Estados que indican jornada activa — no se permite reasignar recursos
  private readonly ESTADOS_ACTIVOS = [
    EstadoChofer.CARGANDO,
    EstadoChofer.VIAJANDO,
    EstadoChofer.DESCANSANDO,
    EstadoChofer.DESCARGANDO,
    EstadoChofer.ENTREGA_FINALIZADA,
  ];

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

  // ─── REGLA 1: Creación de Bateas ───────────────────────────────────────
  // El estado se determina AUTOMÁTICAMENTE:
  //   - Sin chofer_id ni tractor_id → 'vacio'
  //   - Con chofer_id o tractor_id → 'ocupado'
  // El campo 'estado' del frontend se IGNORA al crear.
  async crear(data: {
    marca?: string;
    modelo?: string;
    patente: string;
    seguro?: string;
    transportista?: string;
    carga_max_batea: number;
    chofer_id?: number | string;
    tractor_id?: number | string;
    estado?: EstadoBatea; // Se ignora — el backend lo determina
  }) {
    // Ignorar cualquier estado que venga del frontend
    delete (data as any).estado;

    const choferId = data.chofer_id ? Number(data.chofer_id) : null;
    const tractorId = data.tractor_id ? Number(data.tractor_id) : null;

    // Determinar estado automáticamente
    const estadoFinal = (choferId || tractorId)
      ? EstadoBatea.OCUPADO
      : EstadoBatea.VACIO;

    // Validar patente única
    const existente = await this.bateaRepository.findOne({
      where: { patente: data.patente },
    });

    if (existente) {
      throw new BadRequestException(`Patente ${data.patente} ya existe`);
    }

    // Usar transacción para guardar de forma atómica
    return this.bateaRepository.manager.transaction(async (manager) => {
      const dataToSave: any = { ...data };
      delete dataToSave.chofer_id;
      delete dataToSave.tractor_id;
      dataToSave.estado = estadoFinal;

      if (tractorId) dataToSave.tractor_id = tractorId;

      const batea = manager.create(Batea, dataToSave);
      const savedBatea = await manager.save(Batea, batea);
      const bateaId = savedBatea.batea_id;

      // Si se envió chofer_id, sincronizar la unidad operativa completa
      if (choferId) {
        await this.sincronizarAsignacion(manager, bateaId, choferId);
      } else if (tractorId) {
        // Si solo se envió tractor (sin chofer), actualizar referencia cruzada del tractor
        await manager.query(
          'UPDATE tractores SET batea_id = $1 WHERE tractor_id = $2',
          [bateaId, tractorId],
        );
      }

      // Recargar con relaciones
      return manager.findOne(Batea, {
        where: { batea_id: bateaId },
        relations: ['tractor', 'chofer'],
      });
    });
  }

  // ─── REGLA 3: Actualización de Bateas ──────────────────────────────────
  // Detecta cambios en chofer_id y sincroniza/desvincula según corresponda.
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
      chofer_id?: number | string | null;
      tractor_id?: number | string | null;
    },
  ) {
    if (data.chofer_id === '') data.chofer_id = null;
    if (data.chofer_id !== undefined && data.chofer_id !== null) {
      data.chofer_id = Number(data.chofer_id);
    }
    if (data.tractor_id === '') data.tractor_id = null;
    if (data.tractor_id !== undefined && data.tractor_id !== null) {
      data.tractor_id = Number(data.tractor_id);
    }

    const bateaActual = await this.obtenerPorId(batea_id);

    // Si se está intentando cambiar chofer o tractor, validar que el chofer actual no esté activo
    if (data.chofer_id !== undefined || data.tractor_id !== undefined) {
      if (bateaActual.chofer_id) {
        await this.validarChoferNoActivo(bateaActual.chofer_id);
      }
    }

    // ── Manejo de cambios en chofer_id ──
    if (data.chofer_id !== undefined) {
      const choferAnterior = bateaActual.chofer_id;
      const choferNuevo = data.chofer_id;
      delete data.chofer_id; // Remover del objeto data — se maneja por separado

      // Actualizar campos básicos primero si los hay (sin chofer_id ni tractor_id)
      const camposBasicos = { ...data };
      delete camposBasicos.tractor_id;
      if (Object.keys(camposBasicos).length > 0) {
        await this.bateaRepository.update({ batea_id }, camposBasicos as any);
      }

      // Caso 1: Se quitó el chofer (tenía uno y ahora viene null/vacío)
      if (choferAnterior && !choferNuevo) {
        await this.bateaRepository.manager.transaction(async (manager) => {
          await this.desvincularChofer(manager, batea_id, choferAnterior);
        });
        this.logger.log(`✓ Chofer ${choferAnterior} desvinculado de batea ${batea_id} → estado VACIO`);
        return this.obtenerPorId(batea_id);
      }

      // Caso 2: Se asignó un chofer nuevo (no tenía o cambió)
      if (choferNuevo && choferNuevo !== choferAnterior) {
        await this.bateaRepository.manager.transaction(async (manager) => {
          // Si tenía un chofer anterior, desvincularlo primero
          if (choferAnterior) {
            await this.desvincularChofer(manager, batea_id, choferAnterior);
          }
          // Vincular el nuevo chofer (sincronización completa)
          await this.sincronizarAsignacion(manager, batea_id, Number(choferNuevo));
        });
        this.logger.log(`✓ Chofer ${choferNuevo} asignado a batea ${batea_id} → sincronización completa`);
        return this.obtenerPorId(batea_id);
      }

      // Caso 3: Mismo chofer que ya tenía — no hacer nada de asignación
      return this.obtenerPorId(batea_id);
    }

    // ── Manejo de cambios en tractor_id (sin cambio de chofer) ──
    if (data.tractor_id !== undefined) {
      const tractorId = data.tractor_id;
      delete data.tractor_id;

      // Actualizar campos básicos primero si los hay
      if (Object.keys(data).length > 0) {
        await this.bateaRepository.update({ batea_id }, data as any);
      }

      // Si tractor_id es null, limpiar la asignación bidireccionalmente
      if (!tractorId) {
        await this.bateaRepository.manager.transaction(async (manager) => {
          await manager.query(
            'UPDATE bateas SET tractor_id = NULL WHERE batea_id = $1',
            [batea_id],
          );
          await manager.query(
            'UPDATE tractores SET batea_id = NULL WHERE batea_id = $1',
            [batea_id],
          );
        });
        this.logger.log(`✓ Tractor removido de batea ${batea_id} y tractor actualizado`);
      } else {
        // Usar el método con validaciones
        return this.asignarTractor(batea_id, Number(tractorId));
      }

      return this.obtenerPorId(batea_id);
    }

    // ── Sin cambios de asignación — actualizar campos normalmente ──
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

  // ─── REGLA 2: Asignación de Chofer con sincronización de unidad operativa ─
  async asignarChofer(batea_id: number, chofer_id: number) {
    const batea = await this.obtenerPorId(batea_id);

    // Validar si el chofer actual de la batea está activo
    if (batea.chofer_id) {
      await this.validarChoferNoActivo(batea.chofer_id);
    }

    // 1. Verificar si el chofer existe
    const chofer = await this.bateaRepository.manager.query(
      'SELECT id_chofer, nombre_completo, batea_id, tractor_id, estado_chofer FROM choferes WHERE id_chofer = $1',
      [chofer_id],
    );

    if (!chofer || chofer.length === 0) {
      throw new NotFoundException(`Chofer con ID ${chofer_id} no encontrado`);
    }

    const choferData = chofer[0];

    // Validar si el nuevo chofer está activo
    if (this.ESTADOS_ACTIVOS.includes(choferData.estado_chofer)) {
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

    // 4. Sincronizar la unidad operativa completa (batea ↔ chofer ↔ tractor)
    await this.bateaRepository.manager.transaction(async (manager) => {
      await this.sincronizarAsignacion(manager, batea_id, chofer_id);
    });

    this.logger.log(`✓ Batea ${batea.patente} asignada a chofer ${choferData.nombre_completo} → estado OCUPADO`);
    return this.obtenerPorId(batea_id);
  }

  async asignarTractor(batea_id: number, tractor_id: number) {
    const batea = await this.obtenerPorId(batea_id);

    // Validar si el chofer actual de la batea está activo
    if (batea.chofer_id) {
      await this.validarChoferNoActivo(batea.chofer_id);
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
      await this.validarChoferNoActivo(tractorData.chofer_id);
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

  // ─── REGLA 2: Sincronización de la Unidad Operativa ────────────────────
  // Vincula batea ↔ chofer ↔ tractor en una transacción atómica.
  // Se llama desde crear(), actualizar() y asignarChofer().
  private async sincronizarAsignacion(
    manager: EntityManager,
    batea_id: number,
    chofer_id: number,
  ) {
    // 1. Obtener el chofer completo
    const choferRows = await manager.query(
      'SELECT id_chofer, nombre_completo, batea_id, tractor_id, estado_chofer FROM choferes WHERE id_chofer = $1',
      [chofer_id],
    );

    if (!choferRows || choferRows.length === 0) {
      throw new NotFoundException(`Chofer con ID ${chofer_id} no encontrado`);
    }

    const chofer = choferRows[0];

    // 2. Validar que el chofer no esté en jornada activa
    if (this.ESTADOS_ACTIVOS.includes(chofer.estado_chofer)) {
      throw new BadRequestException('No es posible asignar un chofer con jornada activa.');
    }

    // 3. Validar que el chofer no tenga otra batea asignada
    if (chofer.batea_id && chofer.batea_id !== batea_id) {
      const bateaExistente = await manager.query(
        'SELECT patente FROM bateas WHERE batea_id = $1',
        [chofer.batea_id],
      );
      throw new ConflictException(
        `El chofer ${chofer.nombre_completo} ya tiene asignada la batea con patente ${bateaExistente[0]?.patente || chofer.batea_id}. ` +
        `Debes desasignar primero esa batea antes de asignar una nueva.`
      );
    }

    // 4. Actualizar la batea: asignar chofer y cambiar estado a 'ocupado'
    const updateBatea: any = {
      chofer_id: chofer_id,
      estado: EstadoBatea.OCUPADO,
    };

    // 5. Si el chofer tiene un tractor asignado, vincular también
    if (chofer.tractor_id) {
      updateBatea.tractor_id = chofer.tractor_id;

      // Actualizar el tractor para que apunte a esta batea
      await manager.query(
        'UPDATE tractores SET batea_id = $1 WHERE tractor_id = $2',
        [batea_id, chofer.tractor_id],
      );
      this.logger.log(`  ↳ Tractor ${chofer.tractor_id} vinculado a batea ${batea_id}`);
    }

    // 6. Guardar los cambios en la batea
    await manager.query(
      'UPDATE bateas SET chofer_id = $1, estado = $2' +
      (updateBatea.tractor_id ? ', tractor_id = $3' : '') +
      ' WHERE batea_id = ' + (updateBatea.tractor_id ? '$4' : '$3'),
      updateBatea.tractor_id
        ? [chofer_id, EstadoBatea.OCUPADO, updateBatea.tractor_id, batea_id]
        : [chofer_id, EstadoBatea.OCUPADO, batea_id],
    );

    // 7. Actualizar el chofer para que apunte a esta batea
    await manager.query(
      'UPDATE choferes SET batea_id = $1 WHERE id_chofer = $2',
      [batea_id, chofer_id],
    );

    this.logger.log(`  ↳ Sincronización completa: batea ${batea_id} ↔ chofer ${chofer_id}` +
      (chofer.tractor_id ? ` ↔ tractor ${chofer.tractor_id}` : ''));
  }

  // ─── Desvinculación completa de Chofer de la Unidad Operativa ──────────
  // Limpia las tres entidades: batea, chofer, y tractor (si había).
  private async desvincularChofer(
    manager: EntityManager,
    batea_id: number,
    chofer_id: number,
  ) {
    // 1. Obtener la batea actual para saber el tractor_id
    const bateaRows = await manager.query(
      'SELECT batea_id, tractor_id FROM bateas WHERE batea_id = $1',
      [batea_id],
    );

    const tractorId = bateaRows[0]?.tractor_id;

    // 2. Limpiar la batea: chofer_id, tractor_id y estado → 'vacio'
    await manager.query(
      'UPDATE bateas SET chofer_id = NULL, tractor_id = NULL, estado = $1 WHERE batea_id = $2',
      [EstadoBatea.VACIO, batea_id],
    );

    // 3. Limpiar batea_id del chofer
    await manager.query(
      'UPDATE choferes SET batea_id = NULL WHERE id_chofer = $1',
      [chofer_id],
    );

    // 4. Si había tractor vinculado, limpiar batea_id del tractor
    if (tractorId) {
      await manager.query(
        'UPDATE tractores SET batea_id = NULL WHERE tractor_id = $1',
        [tractorId],
      );
      this.logger.log(`  ↳ Tractor ${tractorId} desvinculado de batea ${batea_id}`);
    }

    this.logger.log(`  ↳ Desvinculación completa: batea ${batea_id} ← chofer ${chofer_id}`);
  }

  // ─── Helper: Validar que un chofer no esté en jornada activa ───────────
  private async validarChoferNoActivo(chofer_id: number) {
    const chofer = await this.bateaRepository.manager.query(
      'SELECT id_chofer, estado_chofer FROM choferes WHERE id_chofer = $1',
      [chofer_id],
    );
    if (chofer && chofer.length > 0) {
      if (this.ESTADOS_ACTIVOS.includes(chofer[0].estado_chofer)) {
        throw new BadRequestException('No es posible modificar los recursos de un chofer con jornada activa.');
      }
    }
  }
}
