import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Viaje, EstadoViaje } from '../entities/viaje.entity';
import { Chofer, EstadoChofer } from '../entities/chofer.entity';
import { Tractor, EstadoTractor } from '../entities/tractor.entity';
import { Batea, EstadoBatea } from '../entities/batea.entity';

@Injectable()
export class ViajesService {
    private readonly logger = new Logger(ViajesService.name);

    constructor(
        @InjectRepository(Viaje)
        private viajeRepository: Repository<Viaje>,
        private dataSource: DataSource,
    ) { }

    async obtenerTodos(user?: any) {
        const query: any = {
            relations: ['chofer', 'tractor', 'batea'],
            order: { fecha_salida: 'DESC' },
        };

        if (user && user.rol === 'chofer' && user.chofer_id) {
            query.where = { chofer_id: user.chofer_id };
        }

        return this.viajeRepository.find(query);
    }

    async obtenerPorId(id_viaje: number, user?: any) {
        const where: any = { id_viaje };

        if (user && user.rol === 'chofer' && user.chofer_id) {
            where.chofer_id = user.chofer_id;
        }

        const viaje = await this.viajeRepository.findOne({
            where,
            relations: ['chofer', 'tractor', 'batea'],
        });

        if (!viaje) {
            throw new NotFoundException(`Viaje ${id_viaje} no encontrado o no tienes permiso para verlo`);
        }
        return viaje;
    }

    async crear(data: {
        chofer_id: number;
        tractor_id: number;
        batea_id: number;
        origen: string;
        destino: string;
        fecha_salida: Date;
        numero_remito?: string;
        toneladas_cargadas?: number;
    }) {
        // Usar transacción
        return this.dataSource.transaction(async (manager) => {
            // 1. Validar Chofer
            const chofer = await manager.findOne(Chofer, {
                where: { id_chofer: data.chofer_id },
                relations: ['tractor', 'batea'],
            });
            if (!chofer) {
                throw new NotFoundException(`Chofer ${data.chofer_id} no encontrado`);
            }
            if (chofer.estado_chofer !== EstadoChofer.DISPONIBLE) {
                throw new BadRequestException(
                    `El chofer debe estar DISPONIBLE para iniciar un viaje. Estado actual: ${chofer.estado_chofer}`,
                );
            }

            // 2. Validar Tractor
            const tractor = await manager.findOne(Tractor, {
                where: { tractor_id: data.tractor_id },
            });
            if (!tractor) {
                throw new NotFoundException(`Tractor ${data.tractor_id} no encontrado`);
            }
            // El tractor debe estar LIBRE u OCUPADO (si ya está asignado al chofer)
            if (tractor.estado_tractor === EstadoTractor.EN_REPARACION) {
                throw new BadRequestException(
                    `El tractor con patente ${tractor.patente} está en reparación.`,
                );
            }

            // 3. Validar Batea
            const batea = await manager.findOne(Batea, {
                where: { batea_id: data.batea_id },
            });
            if (!batea) {
                throw new NotFoundException(`Batea ${data.batea_id} no encontrada`);
            }
            if (batea.estado === EstadoBatea.EN_REPARACION) {
                throw new BadRequestException(
                    `La batea con patente ${batea.patente} está en reparación.`,
                );
            }

            // --- NUEVAS VALIDACIONES DE ASIGNACIÓN ---

            // 4. Validar que el chofer tenga asignado el tractor seleccionado
            if (chofer.tractor_id !== data.tractor_id) {
                throw new ConflictException(
                    `El tractor con patente ${tractor.patente} no está asignado al chofer ${chofer.nombre_completo}. ` +
                    `Tractor actual del chofer: ${chofer.tractor?.patente || 'Ninguno'}`
                );
            }

            // 5. Validar que el chofer tenga asignada la batea seleccionada
            if (chofer.batea_id !== data.batea_id) {
                throw new ConflictException(
                    `La batea con patente ${batea.patente} no está asignada al chofer ${chofer.nombre_completo}. ` +
                    `Batea actual del chofer: ${chofer.batea?.patente || 'Ninguna'}`
                );
            }

            // 6. Validar que el tractor tenga asignada la batea seleccionada
            if (tractor.batea_id && tractor.batea_id !== data.batea_id) {
                const bateaTractor = await manager.findOne(Batea, { where: { batea_id: tractor.batea_id } });
                throw new ConflictException(
                    `El tractor con patente ${tractor.patente} tiene asignada una batea diferente (${bateaTractor?.patente || tractor.batea_id})`
                );
            }

            // 7. Crear el viaje
            const nuevoViaje = manager.create(Viaje, {
                ...data,
                estado_viaje: EstadoViaje.EN_CURSO,
                horas_descansadas: 0,
            });
            await manager.save(nuevoViaje);

            // 8. Actualizar estados de recursos
            await manager.update(
                Tractor,
                { tractor_id: data.tractor_id },
                { estado_tractor: EstadoTractor.OCUPADO },
            );

            await manager.update(
                Batea,
                { batea_id: data.batea_id },
                { estado: EstadoBatea.CARGADO },
            );

            // 3.5 Validar Carga Máxima
            if (data.toneladas_cargadas) {
                const capacidadTractor = tractor.carga_max_tractor || 0;
                const capacidadBatea = batea.carga_max_batea || 0;
                const limiteCarga = Math.min(capacidadTractor, capacidadBatea);

                if (data.toneladas_cargadas > limiteCarga) {
                    throw new BadRequestException(
                        `Exceso de carga: La carga solicitada (${data.toneladas_cargadas}t) excede el límite operativo de ${limiteCarga}t (Tractor: ${capacidadTractor}t, Batea: ${capacidadBatea}t)`,
                    );
                }
            }

            return nuevoViaje;
        });
    }

    async eliminar(id_viaje: number, user?: any) {
        this.logger.log(`[DELETE] Iniciando eliminación de viaje ID=${id_viaje} por usuario ${user?.nombre || 'Sistema'}`);

        // 1. Verificar que el viaje existe y obtener datos completos
        const viaje = await this.viajeRepository.findOne({
            where: { id_viaje },
            relations: ['chofer', 'tractor', 'batea'],
        });

        if (!viaje) {
            this.logger.warn(`[DELETE] Viaje ID=${id_viaje} no encontrado`);
            throw new NotFoundException(`El viaje con ID ${id_viaje} no existe`);
        }

        this.logger.log(`[DELETE] Encontrado viaje ID=${id_viaje}, iniciando eliminación...`);

        // 2. Definir estados relacionados con viajes (para uso posterior)
        const estadosRelacionadosConViaje = [
            EstadoChofer.CARGANDO,
            EstadoChofer.VIAJANDO,
            EstadoChofer.DESCANSANDO,
            EstadoChofer.DESCARGANDO,
        ];

        // 3. Ejecutar eliminación en transacción atómica
        try {
            return await this.dataSource.transaction(async (manager) => {
                // Obtener datos actuales de los recursos para logs
                const chofer = viaje.chofer;
                const tractor = viaje.tractor;
                const batea = viaje.batea;

                // 4. Liberar Tractor (siempre, independientemente del estado del viaje)
                if (tractor) {
                    await manager.update(
                        Tractor,
                        { tractor_id: viaje.tractor_id },
                        { estado_tractor: EstadoTractor.LIBRE },
                    );
                    this.logger.log(`✓ Tractor ${tractor.patente} liberado (estado: LIBRE)`);
                }

                // 5. Liberar Batea (siempre, independientemente del estado del viaje)
                if (batea) {
                    await manager.update(
                        Batea,
                        { batea_id: viaje.batea_id },
                        { estado: EstadoBatea.VACIO },
                    );
                    this.logger.log(`✓ Batea ${batea.patente} liberada (estado: VACIO)`);
                }

                // 6. Actualizar estado del Chofer si es necesario
                if (chofer) {
                    // Si el chofer está en un estado relacionado con el viaje, ponerlo DISPONIBLE
                    if (estadosRelacionadosConViaje.includes(chofer.estado_chofer)) {
                        await manager.update(
                            Chofer,
                            { id_chofer: viaje.chofer_id },
                            { estado_chofer: EstadoChofer.DISPONIBLE },
                        );
                        this.logger.log(
                            `✓ Chofer ${chofer.nombre_completo} liberado (estado: DISPONIBLE, anterior: ${chofer.estado_chofer})`
                        );
                    } else {
                        this.logger.log(
                            `ℹ️  Chofer ${chofer.nombre_completo} mantiene su estado: ${chofer.estado_chofer}`
                        );
                    }
                }

                // 6. Eliminar el viaje
                await manager.delete(Viaje, { id_viaje });

                // 7. Log de auditoría completo
                const adminInfo = user ? `${user.nombre} (ID: ${user.usuario_id})` : 'Sistema';
                this.logger.log(
                    `[AUDITORÍA] Admin ${adminInfo} eliminó viaje ID=${id_viaje} - ` +
                    `Recursos liberados: Chofer=${chofer?.nombre_completo || 'N/A'}, ` +
                    `Tractor=${tractor?.patente || 'N/A'}, Batea=${batea?.patente || 'N/A'} - ` +
                    `Timestamp: ${new Date().toISOString()}`
                );

                // 8. Retornar respuesta exitosa
                return {
                    message: 'Viaje eliminado correctamente',
                    viaje_id: id_viaje,
                    recursos_liberados: {
                        chofer: chofer ? {
                            id: chofer.id_chofer,
                            nombre: chofer.nombre_completo,
                            nuevo_estado: estadosRelacionadosConViaje.includes(chofer.estado_chofer)
                                ? EstadoChofer.DISPONIBLE
                                : chofer.estado_chofer,
                        } : null,
                        tractor: tractor ? {
                            id: tractor.tractor_id,
                            patente: tractor.patente,
                            nuevo_estado: EstadoTractor.LIBRE,
                        } : null,
                        batea: batea ? {
                            id: batea.batea_id,
                            patente: batea.patente,
                            nuevo_estado: EstadoBatea.VACIO,
                        } : null,
                    },
                };
            });
        } catch (error) {
            this.logger.error(`[DELETE] Error al eliminar viaje ID=${id_viaje}: ${error.message}`, error.stack);

            // Si es un error de base de datos, proporcionar más detalles
            if (error.code) {
                this.logger.error(`[DELETE] Código de error de base de datos: ${error.code}`);
            }

            // Re-lanzar el error para que NestJS lo maneje
            throw error;
        }
    }
}
