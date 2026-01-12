import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Not } from 'typeorm';
import { Chofer, EstadoChofer } from '../entities/chofer.entity';
import { Viaje, EstadoViaje } from '../entities/viaje.entity';
import { NotFoundException } from '../common/exceptions/custom-exceptions';
import { PeriodosDescansoService } from '../periodos-descanso/periodos-descanso.service';

@Injectable()
export class ChoferesService {
  private readonly logger = new Logger(ChoferesService.name);

  constructor(
    @InjectRepository(Chofer)
    private choferRepository: Repository<Chofer>,
    @InjectRepository(Viaje)
    private viajeRepository: Repository<Viaje>,
    private periodosDescansoService: PeriodosDescansoService,
  ) {
    this.logger.log('✓ Servicio de Choferes inicializado');
  }

  async obtenerTodos(estado?: EstadoChofer) {
    const where: any = {};
    if (estado) {
      where.estado_chofer = estado;
    }

    return this.choferRepository.find({
      where,
      relations: ['tractor', 'batea'],
      order: { nombre_completo: 'ASC' },
    });
  }

  async obtenerPorId(id_chofer: number) {
    const chofer = await this.choferRepository.findOne({
      where: { id_chofer },
      relations: ['tractor', 'batea'],
    });

    if (!chofer) {
      throw new NotFoundException(
        'Chofer no encontrado',
        `No existe un chofer con el ID ${id_chofer}`,
      );
    }
    return chofer;
  }

  async obtenerViajeActivo(chofer_id: number) {
    // Verificar que el chofer existe
    const chofer = await this.choferRepository.findOne({
      where: { id_chofer: chofer_id },
    });

    if (!chofer) {
      throw new NotFoundException(
        'Chofer no encontrado',
        `No existe un chofer con el ID ${chofer_id}`,
      );
    }

    // Buscar el viaje activo del chofer (cualquier estado excepto FINALIZADO)
    const viajeActivo = await this.viajeRepository.findOne({
      where: {
        chofer_id,
        estado_viaje: Not(EstadoViaje.FINALIZADO),
      },
      relations: ['tractor', 'batea', 'chofer'],
      order: { creado_en: 'DESC' },
    });

    // Si no hay viaje activo, devolver null
    if (!viajeActivo) {
      return null;
    }

    return viajeActivo;
  }

  async actualizarEstadoChofer(
    chofer_id: number,
    estado_chofer: EstadoChofer,
    razon_estado?: string,
    fecha_inicio_licencia?: Date,
    fecha_fin_licencia?: Date,
    confirmado?: boolean,
    toneladas_descargadas?: number,
  ) {
    if (!chofer_id) {
      throw new BadRequestException('Usuario no tiene un chofer asociado');
    }

    const chofer = await this.obtenerPorId(chofer_id);

    if (chofer.estado_chofer === estado_chofer) {
      throw new BadRequestException('El estado es el mismo que ya tiene');
    }

    // --- Requerimiento de Confirmación ---
    // Se requiere confirmación explícita para CUALQUIER cambio de estado
    if (!confirmado) {
      throw new BadRequestException(
        'Se requiere confirmación para cambiar de estado. Debes confirmar explícitamente este cambio.',
      );
    }

    // --- Validación de Secuencia de Estados ---
    const proximoEstado = await this.validarProximoEstado(chofer.estado_chofer, estado_chofer, chofer_id);

    if (!proximoEstado.valido) {
      throw new BadRequestException(proximoEstado.mensaje);
    }

    const estadosLicencia = [
      EstadoChofer.LICENCIA_ANUAL,
      EstadoChofer.FRANCO,
      EstadoChofer.EQUIPO_EN_REPARACION,
    ];

    const esLicencia = estadosLicencia.includes(estado_chofer);

    // Validaciones para estados de licencia
    if (esLicencia) {
      if (!fecha_inicio_licencia) {
        throw new BadRequestException(
          'La fecha de inicio es obligatoria para este estado',
        );
      }

      if (fecha_fin_licencia) {
        const fechaInicio = new Date(fecha_inicio_licencia);
        const fechaFin = new Date(fecha_fin_licencia);

        if (fechaFin < fechaInicio) {
          throw new BadRequestException(
            'La fecha de fin no puede ser anterior a la fecha de inicio',
          );
        }
      }
    }

    // Preparar datos de actualización
    const updateData: any = {
      estado_chofer,
      razon_estado: razon_estado ?? null,
      ultimo_estado_en: new Date(),
    };

    if (esLicencia) {
      updateData.fecha_inicio_licencia = fecha_inicio_licencia;
      updateData.fecha_fin_licencia = fecha_fin_licencia ?? null;
    } else {
      // Limpiar fechas si no es licencia
      updateData.fecha_inicio_licencia = null;
      updateData.fecha_fin_licencia = null;
    }

    // --- Manejo de Descanso en Viaje ---
    if (estado_chofer === EstadoChofer.DESCANSANDO) {
      const viajeEnCurso = await this.viajeRepository.findOne({
        where: {
          chofer_id,
          estado_viaje: Not(EstadoViaje.FINALIZADO),
        },
      });

      if (viajeEnCurso) {
        await this.periodosDescansoService.iniciarPeriodo(viajeEnCurso.id_viaje);
        this.logger.log(`✓ Viaje ${viajeEnCurso.id_viaje}: nuevo período de descanso iniciado`);
      }
    } else if (chofer.estado_chofer === EstadoChofer.DESCANSANDO && estado_chofer === EstadoChofer.VIAJANDO) {
      const viajeEnCurso = await this.viajeRepository.findOne({
        where: {
          chofer_id,
          estado_viaje: Not(EstadoViaje.FINALIZADO),
        },
      });

      if (viajeEnCurso) {
        await this.periodosDescansoService.finalizarPeriodo(viajeEnCurso.id_viaje);
        this.logger.log(`✓ Viaje ${viajeEnCurso.id_viaje}: período de descanso finalizado y horas acumuladas`);
      }
    }

    // --- Manejo de Toneladas Descargadas ---
    if (estado_chofer === EstadoChofer.DESCARGANDO) {
      const viajeEnCurso = await this.viajeRepository.findOne({
        where: {
          chofer_id,
          estado_viaje: Not(EstadoViaje.FINALIZADO),
        },
      });

      if (viajeEnCurso) {
        if (toneladas_descargadas !== undefined) {
          await this.viajeRepository.update(
            { id_viaje: viajeEnCurso.id_viaje },
            { toneladas_descargadas },
          );
          this.logger.log(`✓ Viaje ${viajeEnCurso.id_viaje}: ${toneladas_descargadas} toneladas registradas`);
        }
      } else {
        // Solo si se intenta pasar a DESCARGANDO sin viaje activo y se enviaron toneladas
        if (toneladas_descargadas !== undefined) {
          throw new BadRequestException('No hay un viaje activo para registrar toneladas');
        }
      }
    }

    // --- Manejo de ENTREGA_FINALIZADA ---
    if (estado_chofer === EstadoChofer.ENTREGA_FINALIZADA) {
      const viajeEnCurso = await this.viajeRepository.findOne({
        where: {
          chofer_id,
          estado_viaje: Not(EstadoViaje.FINALIZADO),
        },
        relations: ['chofer', 'tractor', 'batea'],
      });

      if (!viajeEnCurso) {
        throw new BadRequestException(
          'No puedes finalizar la entrega sin tener un viaje activo'
        );
      }

      if (!toneladas_descargadas || toneladas_descargadas <= 0) {
        throw new BadRequestException(
          'Debes proporcionar las toneladas descargadas (mayor a 0)'
        );
      }

      this.logger.log(`[ENTREGA_FINALIZADA] Finalizando viaje ${viajeEnCurso.id_viaje} con ${toneladas_descargadas} toneladas`);

      // Actualizar el viaje: toneladas, fecha descarga y estado finalizado
      await this.viajeRepository.update(
        { id_viaje: viajeEnCurso.id_viaje },
        {
          toneladas_descargadas,
          fecha_descarga: new Date(),
          estado_viaje: EstadoViaje.FINALIZADO,
        }
      );

      this.logger.log(`✓ Viaje ${viajeEnCurso.id_viaje}: ${toneladas_descargadas} toneladas, fecha descarga registrada, estado FINALIZADO`);

      // Actualizar estado del Tractor (mantiene asignación al chofer)
      if (viajeEnCurso.tractor) {
        await this.choferRepository.manager.query(
          'UPDATE tractores SET estado_tractor = $1 WHERE tractor_id = $2',
          ['libre', viajeEnCurso.tractor_id]
        );
        this.logger.log(`✓ Tractor ${viajeEnCurso.tractor.patente} ahora LIBRE (mantiene asignación al chofer)`);
      }

      // Actualizar estado de la Batea (mantiene asignación al chofer)
      if (viajeEnCurso.batea) {
        await this.choferRepository.manager.query(
          'UPDATE bateas SET estado = $1 WHERE batea_id = $2',
          ['vacio', viajeEnCurso.batea_id]
        );
        this.logger.log(`✓ Batea ${viajeEnCurso.batea.patente} ahora VACÍA (mantiene asignación al chofer)`);
      }

      // Actualizar el chofer a DISPONIBLE (mantiene tractor y batea asignados)
      updateData.estado_chofer = EstadoChofer.DISPONIBLE;

      this.logger.log(`✓ Chofer ${chofer.nombre_completo} ahora DISPONIBLE (mantiene tractor y batea asignados)`);
    }

    // Guardar cambios en el chofer
    await this.choferRepository.update({ id_chofer: chofer_id }, updateData);

    // Actualizar estado del viaje si corresponde
    // NO actualizar si es ENTREGA_FINALIZADA porque ya se actualizó manualmente con las toneladas y fecha
    if (estado_chofer !== EstadoChofer.ENTREGA_FINALIZADA) {
      await this.actualizarEstadoViajeSegunChofer(chofer_id, estado_chofer);
    }

    return this.obtenerPorId(chofer_id);
  }

  /**
   * Actualiza el estado del viaje en curso según el estado del chofer
   */
  private async actualizarEstadoViajeSegunChofer(
    chofer_id: number,
    estado_chofer: EstadoChofer,
  ) {
    const viajeEnCurso = await this.viajeRepository.findOne({
      where: {
        chofer_id,
        estado_viaje: Not(EstadoViaje.FINALIZADO),
      },
    });

    if (!viajeEnCurso) return;

    let nuevoEstadoViaje: EstadoViaje | null = null;

    switch (estado_chofer) {
      case EstadoChofer.CARGANDO:
        nuevoEstadoViaje = EstadoViaje.CARGANDO;
        break;
      case EstadoChofer.VIAJANDO:
        nuevoEstadoViaje = EstadoViaje.VIAJANDO;
        break;
      case EstadoChofer.DESCANSANDO:
        nuevoEstadoViaje = EstadoViaje.DESCANSANDO;
        break;
      case EstadoChofer.DESCARGANDO:
        nuevoEstadoViaje = EstadoViaje.DESCARGANDO;
        break;
      case EstadoChofer.ENTREGA_FINALIZADA:
        nuevoEstadoViaje = EstadoViaje.FINALIZADO;
        break;
    }

    if (nuevoEstadoViaje) {
      await this.viajeRepository.update(
        { id_viaje: viajeEnCurso.id_viaje },
        { estado_viaje: nuevoEstadoViaje },
      );
    }
  }

  private async validarProximoEstado(
    actual: EstadoChofer,
    nuevo: EstadoChofer,
    chofer_id: number,
  ): Promise<{ valido: boolean; mensaje: string }> {
    // Restricción especial: Desde VIAJANDO no se puede pasar a FRANCO ni LICENCIA_ANUAL
    if (actual === EstadoChofer.VIAJANDO &&
      (nuevo === EstadoChofer.FRANCO || nuevo === EstadoChofer.LICENCIA_ANUAL)) {
      return {
        valido: false,
        mensaje: 'No puedes cambiar de VIAJANDO a FRANCO o LICENCIA_ANUAL. Debes completar el viaje primero (pasar por DESCANSANDO → DESCARGANDO → ENTREGA_FINALIZADA → DISPONIBLE).',
      };
    }

    // Estados de excepción que pueden aplicarse desde cualquier estado (emergencias)
    const estadosExcepcion = [
      EstadoChofer.LICENCIA_ANUAL,
      EstadoChofer.FRANCO,
      EstadoChofer.EQUIPO_EN_REPARACION,
      EstadoChofer.INACTIVO,
    ];

    if (estadosExcepcion.includes(nuevo)) {
      return { valido: true, mensaje: '' };
    }

    // Caso especial: DISPONIBLE → CARGANDO solo si tiene viaje asignado
    if (actual === EstadoChofer.DISPONIBLE && nuevo === EstadoChofer.CARGANDO) {
      const viajeAsignado = await this.viajeRepository.findOne({
        where: {
          chofer_id,
          estado_viaje: Not(EstadoViaje.FINALIZADO),
        },
      });

      if (!viajeAsignado) {
        return {
          valido: false,
          mensaje: 'No puedes cambiar a CARGANDO sin tener un viaje asignado. El administrador debe asignarte un viaje primero.',
        };
      }

      // Tiene viaje asignado, puede continuar
      return { valido: true, mensaje: '' };
    }

    // Caso especial PRIMERO: VIAJANDO → DESCARGANDO solo si ya pasó por DESCANSANDO
    if (actual === EstadoChofer.VIAJANDO && nuevo === EstadoChofer.DESCARGANDO) {
      // Verificar si el chofer ya descansó en este viaje
      const viajeEnCurso = await this.viajeRepository.findOne({
        where: {
          chofer_id,
          estado_viaje: Not(EstadoViaje.FINALIZADO),
        },
      });

      if (!viajeEnCurso) {
        return {
          valido: false,
          mensaje: 'No hay un viaje activo para este chofer. Debe crear un viaje primero.',
        };
      }

      // Verificar si tiene al menos un período de descanso completo
      const tieneDescanso = await this.periodosDescansoService.tieneDescansoCompleto(viajeEnCurso.id_viaje);

      if (tieneDescanso) {
        // Ya pasó por al menos un descanso, puede descargar
        return { valido: true, mensaje: '' };
      } else {
        return {
          valido: false,
          mensaje: 'Debe marcar DESCANSANDO antes de poder DESCARGAR. El sistema necesita registrar sus horas de descanso.',
        };
      }
    }

    // Flujo normal estricto:
    // DISPONIBLE → CARGANDO → VIAJANDO → DESCANSANDO → VIAJANDO → DESCARGANDO → ENTREGA_FINALIZADA → DISPONIBLE
    const secuencia: Record<EstadoChofer, EstadoChofer[]> = {
      [EstadoChofer.DISPONIBLE]: [EstadoChofer.CARGANDO],
      [EstadoChofer.CARGANDO]: [EstadoChofer.VIAJANDO, EstadoChofer.DISPONIBLE], // Puede cancelar antes de salir
      [EstadoChofer.VIAJANDO]: [EstadoChofer.DESCANSANDO, EstadoChofer.DESCARGANDO], // Puede ir a DESCANSANDO (obligatorio) o DESCARGANDO (si ya descansó)
      [EstadoChofer.DESCANSANDO]: [EstadoChofer.VIAJANDO], // Vuelve a VIAJANDO para cerrar descanso
      [EstadoChofer.DESCARGANDO]: [EstadoChofer.ENTREGA_FINALIZADA, EstadoChofer.VIAJANDO, EstadoChofer.DISPONIBLE], // Puede finalizar entrega o volver
      [EstadoChofer.ENTREGA_FINALIZADA]: [EstadoChofer.DISPONIBLE], // Automáticamente vuelve a DISPONIBLE
      [EstadoChofer.LICENCIA_ANUAL]: [EstadoChofer.DISPONIBLE],
      [EstadoChofer.FRANCO]: [EstadoChofer.DISPONIBLE],
      [EstadoChofer.EQUIPO_EN_REPARACION]: [EstadoChofer.DISPONIBLE],
      [EstadoChofer.INACTIVO]: [EstadoChofer.DISPONIBLE],
    };

    const permitidos = secuencia[actual] || [];

    if (permitidos.includes(nuevo)) {
      return { valido: true, mensaje: '' };
    }

    // Mensajes de error más descriptivos según el contexto
    let mensajeError = `No puede cambiar de "${actual}" a "${nuevo}".`;

    if (actual === EstadoChofer.DISPONIBLE && nuevo !== EstadoChofer.CARGANDO) {
      mensajeError = 'Desde DISPONIBLE solo puede pasar a CARGANDO cuando se le asigne un viaje.';
    } else if (actual === EstadoChofer.CARGANDO && nuevo !== EstadoChofer.VIAJANDO && nuevo !== EstadoChofer.DISPONIBLE) {
      mensajeError = 'Desde CARGANDO debe pasar a VIAJANDO para iniciar el viaje, o volver a DISPONIBLE si se cancela.';
    } else if (actual === EstadoChofer.VIAJANDO && nuevo !== EstadoChofer.DESCANSANDO) {
      mensajeError = 'Desde VIAJANDO debe pasar a DESCANSANDO para registrar su periodo de descanso obligatorio.';
    } else if (actual === EstadoChofer.DESCANSANDO && nuevo !== EstadoChofer.VIAJANDO) {
      mensajeError = 'Desde DESCANSANDO debe volver a VIAJANDO para continuar el viaje.';
    } else if (actual === EstadoChofer.DESCARGANDO && nuevo !== EstadoChofer.ENTREGA_FINALIZADA && nuevo !== EstadoChofer.VIAJANDO && nuevo !== EstadoChofer.DISPONIBLE) {
      mensajeError = 'Desde DESCARGANDO debe pasar a ENTREGA_FINALIZADA con las toneladas descargadas, o puede volver a VIAJANDO/DISPONIBLE.';
    } else if (actual === EstadoChofer.ENTREGA_FINALIZADA && nuevo !== EstadoChofer.DISPONIBLE) {
      mensajeError = 'Desde ENTREGA_FINALIZADA automáticamente pasa a DISPONIBLE.';
    }

    return {
      valido: false,
      mensaje: mensajeError,
    };
  }

  async actualizarEstado(
    id_chofer: number,
    estado_chofer: EstadoChofer,
    razon_estado?: string,
  ) {
    // Los admins también deben respetar el flujo obligatorio
    // Solo pasan confirmado=true para saltarse la confirmación en el frontend
    return this.actualizarEstadoChofer(id_chofer, estado_chofer, razon_estado, undefined, undefined, false);
  }


  async verificarDisponibilidad(tractor_id: number, batea_id: number) {
    const choferes = await this.choferRepository.find({
      where: {
        tractor_id,
        batea_id,
      },
    });

    // Tractor+batea disponibles si NO hay chofer activo o descansando
    const disponible = !choferes.some(
      (c) =>
        c.estado_chofer === EstadoChofer.DISPONIBLE ||
        c.estado_chofer === EstadoChofer.DESCANSANDO,
    );

    return { disponible, choferes };
  }

  async crear(data: { nombre_completo: string; estado_chofer?: EstadoChofer }) {
    const chofer = this.choferRepository.create(data);
    return this.choferRepository.save(chofer);
  }

  async actualizar(
    id_chofer: number,
    data: {
      nombre_completo?: string;
      estado_chofer?: EstadoChofer;
      batea_id?: number;
      tractor_id?: number;
    },
  ) {
    // Obtener el chofer actual con sus relaciones
    const choferActual = await this.obtenerPorId(id_chofer);

    // Remover validación de estado para permitir asignaciones flexibles desde el frontend
    // El frontend maneja la lógica de negocio de cuándo permitir asignaciones

    // Usar transacción para garantizar consistencia atómica
    await this.choferRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // ==================== MANEJO DE BATEA_ID ====================
        if ('batea_id' in data) {
          const nuevaBateaId = data.batea_id;
          const bateaAnteriorId = choferActual.batea_id;

          this.logger.log(
            `[Chofer ${id_chofer}] Actualizando batea: ${bateaAnteriorId} -> ${nuevaBateaId}`,
          );

          // Si tenía una batea anterior, limpiar esa relación
          if (bateaAnteriorId && bateaAnteriorId !== nuevaBateaId) {
            this.logger.log(
              `[Chofer ${id_chofer}] Limpiando batea anterior: ${bateaAnteriorId}`,
            );
            await transactionalEntityManager.query(
              'UPDATE bateas SET chofer_id = NULL WHERE batea_id = $1',
              [bateaAnteriorId],
            );
          }

          // Si se está asignando una nueva batea (no null)
          if (nuevaBateaId) {
            // Verificar que la nueva batea existe
            const bateaNueva = await transactionalEntityManager.query<
              Array<{
                batea_id: number;
                estado: string;
                chofer_id: number | null;
              }>
            >('SELECT * FROM bateas WHERE batea_id = $1', [nuevaBateaId]);

            if (!bateaNueva || bateaNueva.length === 0) {
              throw new NotFoundException(
                `La batea ${nuevaBateaId} no encontrada`,
              );
            }

            // Remover validación de estado para permitir reasignaciones
            // if (bateaNueva[0].estado !== 'vacio') {
            //   throw new BadRequestException(
            //     `La batea ${nuevaBateaId} no está VACIA (Estado: ${bateaNueva[0].estado}). No se puede asignar.`,
            //   );
            // }

            const choferAnteriorDeBatea = bateaNueva[0].chofer_id;

            // Si la batea tenía otro chofer asignado, limpiar ese chofer
            if (choferAnteriorDeBatea && choferAnteriorDeBatea !== id_chofer) {
              this.logger.log(
                `[Batea ${nuevaBateaId}] Limpiando chofer anterior: ${choferAnteriorDeBatea}`,
              );
              await transactionalEntityManager.query(
                'UPDATE choferes SET batea_id = NULL WHERE id_chofer = $1',
                [choferAnteriorDeBatea],
              );
            }

            // Asignar la nueva batea al chofer actual
            this.logger.log(
              `[Batea ${nuevaBateaId}] Asignando chofer: ${id_chofer}`,
            );
            await transactionalEntityManager.query(
              'UPDATE bateas SET chofer_id = $1 WHERE batea_id = $2',
              [id_chofer, nuevaBateaId],
            );
          }
        }

        // ==================== MANEJO DE TRACTOR_ID ====================
        if ('tractor_id' in data) {
          const nuevoTractorId = data.tractor_id;
          const tractorAnteriorId = choferActual.tractor_id;

          this.logger.log(
            `[Chofer ${id_chofer}] Actualizando tractor: ${tractorAnteriorId} -> ${nuevoTractorId}`,
          );

          // Si tenía un tractor anterior, limpiar esa relación
          if (tractorAnteriorId && tractorAnteriorId !== nuevoTractorId) {
            this.logger.log(
              `[Chofer ${id_chofer}] Limpiando tractor anterior: ${tractorAnteriorId}`,
            );
            await transactionalEntityManager.query(
              'UPDATE tractores SET chofer_id = NULL WHERE tractor_id = $1',
              [tractorAnteriorId],
            );
          }

          // Si se está asignando un nuevo tractor (no null)
          if (nuevoTractorId) {
            // Verificar que el nuevo tractor existe
            const tractorNuevo = await transactionalEntityManager.query<
              Array<{
                tractor_id: number;
                estado_tractor: string;
                chofer_id: number | null;
              }>
            >('SELECT * FROM tractores WHERE tractor_id = $1', [
              nuevoTractorId,
            ]);

            if (!tractorNuevo || tractorNuevo.length === 0) {
              throw new NotFoundException(
                `El tractor ${nuevoTractorId} no encontrado`,
              );
            }

            // Remover validación de estado para permitir reasignaciones
            // if (tractorNuevo[0].estado_tractor !== 'libre') {
            //   throw new BadRequestException(
            //     `El tractor ${nuevoTractorId} no está LIBRE (Estado: ${tractorNuevo[0].estado_tractor}). No se puede asignar.`,
            //   );
            // }

            const choferAnteriorDeTractor = tractorNuevo[0].chofer_id;

            // Si el tractor tenía otro chofer asignado, limpiar ese chofer
            if (choferAnteriorDeTractor && choferAnteriorDeTractor !== id_chofer) {
              this.logger.log(
                `[Tractor ${nuevoTractorId}] Limpiando chofer anterior: ${choferAnteriorDeTractor}`,
              );
              await transactionalEntityManager.query(
                'UPDATE choferes SET tractor_id = NULL WHERE id_chofer = $1',
                [choferAnteriorDeTractor],
              );
            }

            // Asignar el nuevo tractor al chofer actual
            this.logger.log(
              `[Tractor ${nuevoTractorId}] Asignando chofer: ${id_chofer}`,
            );
            await transactionalEntityManager.query(
              'UPDATE tractores SET chofer_id = $1 WHERE tractor_id = $2',
              [id_chofer, nuevoTractorId],
            );
          }
        }

        // Actualizar el chofer con todos los datos
        await transactionalEntityManager.update(
          'choferes',
          { id_chofer },
          data,
        );

        this.logger.log(`✓ Chofer ${id_chofer} actualizado`);
      },
    );

    // Retornar el chofer actualizado con todas sus relaciones
    return this.obtenerPorId(id_chofer);
  }

  async eliminar(id_chofer: number) {
    // Verificar que existe
    await this.obtenerPorId(id_chofer);

    // Eliminar directamente sin cargar relaciones
    await this.choferRepository.delete({ id_chofer });

    this.logger.log(`✓ Chofer ${id_chofer} eliminado`);
    return { mensaje: `Chofer ${id_chofer} eliminado` };
  }

  async buscarPorApellido(apellido: string) {
    return this.choferRepository.find({
      where: {
        nombre_completo: Like(`%${apellido}%`),
      },
      relations: ['tractor', 'batea'],
      order: { nombre_completo: 'ASC' },
    });
  }
}
