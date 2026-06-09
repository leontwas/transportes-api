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
import { Notificacion } from '../entities/notificacion.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ViajesService {
    private readonly logger = new Logger(ViajesService.name);

    constructor(
        @InjectRepository(Viaje)
        private viajeRepository: Repository<Viaje>,
        @InjectRepository(Notificacion)
        private notificacionRepository: Repository<Notificacion>,
        private dataSource: DataSource,
        private mailService: MailService,
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
        toneladas_cargadas: number;
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

            // 3.5 Validar Carga Máxima (toneladas_cargadas ahora es obligatorio)
            const capacidadTractor = tractor.carga_max_tractor || 0;
            const capacidadBatea = batea.carga_max_batea || 0;
            const limiteCarga = Math.min(capacidadTractor, capacidadBatea);

            if (data.toneladas_cargadas > limiteCarga) {
                throw new BadRequestException(
                    `Exceso de carga: La carga solicitada (${data.toneladas_cargadas}t) excede el límite operativo de ${limiteCarga}t (Tractor: ${capacidadTractor}t, Batea: ${capacidadBatea}t)`,
                );
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

    async anular(id_viaje: number, user?: any) {
        this.logger.log(`[ANULAR] Iniciando anulación de viaje ID=${id_viaje} por usuario ${user?.nombre || 'Sistema'}`);

        // 1. Verificar que el viaje existe
        const viaje = await this.viajeRepository.findOne({
            where: { id_viaje },
            relations: ['chofer', 'tractor', 'batea'],
        });

        if (!viaje) {
            this.logger.warn(`[ANULAR] Viaje ID=${id_viaje} no encontrado`);
            throw new NotFoundException(`El viaje con ID ${id_viaje} no existe`);
        }

        // 2. Verificar que el viaje no esté ya anulado
        if (viaje.estado_viaje === EstadoViaje.ANULADO) {
            this.logger.warn(`[ANULAR] Viaje ID=${id_viaje} ya fue anulado previamente`);
            throw new BadRequestException(
                `El viaje con ID ${id_viaje} ya fue anulado previamente y no es válido para anulación.`
            );
        }

        // 3. Verificar que el viaje no esté finalizado
        if (viaje.estado_viaje === EstadoViaje.FINALIZADO) {
            this.logger.warn(`[ANULAR] Viaje ID=${id_viaje} ya está finalizado`);
            throw new BadRequestException(
                `El viaje con ID ${id_viaje} ya está finalizado y no puede ser anulado.`
            );
        }

        // 4. Definir estados de chofer relacionados con viajes
        const estadosRelacionadosConViaje = [
            EstadoChofer.CARGANDO,
            EstadoChofer.VIAJANDO,
            EstadoChofer.DESCANSANDO,
            EstadoChofer.DESCARGANDO,
        ];

        // 5. Ejecutar anulación en transacción atómica
        try {
            return await this.dataSource.transaction(async (manager) => {
                const chofer = viaje.chofer;
                const tractor = viaje.tractor;
                const batea = viaje.batea;

                // 6. Liberar Tractor
                if (tractor) {
                    await manager.update(
                        Tractor,
                        { tractor_id: viaje.tractor_id },
                        { estado_tractor: EstadoTractor.LIBRE },
                    );
                    this.logger.log(`✓ Tractor ${tractor.patente} liberado (estado: LIBRE)`);
                }

                // 7. Liberar Batea
                if (batea) {
                    await manager.update(
                        Batea,
                        { batea_id: viaje.batea_id },
                        { estado: EstadoBatea.VACIO },
                    );
                    this.logger.log(`✓ Batea ${batea.patente} liberada (estado: VACIO)`);
                }

                // 8. Actualizar estado del Chofer si es necesario
                if (chofer) {
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

                // 9. Marcar el viaje como ANULADO (no se elimina de la BD)
                await manager.update(
                    Viaje,
                    { id_viaje },
                    { estado_viaje: EstadoViaje.ANULADO },
                );

                // 10. Log de auditoría
                const adminInfo = user ? `${user.nombre} (ID: ${user.usuario_id})` : 'Sistema';
                this.logger.log(
                    `[AUDITORÍA] Admin ${adminInfo} anuló viaje ID=${id_viaje} - ` +
                    `Recursos liberados: Chofer=${chofer?.nombre_completo || 'N/A'}, ` +
                    `Tractor=${tractor?.patente || 'N/A'}, Batea=${batea?.patente || 'N/A'} - ` +
                    `Timestamp: ${new Date().toISOString()}`
                );

                // 11. Retornar respuesta exitosa
                return {
                    message: 'El viaje fue anulado y los recursos han sido liberados correctamente.',
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
            // Re-throw NestJS exceptions (NotFoundException, BadRequestException) as-is
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`[ANULAR] Error al anular viaje ID=${id_viaje}: ${error.message}`, error.stack);
            throw error;
        }
    }

    async actualizar(id_viaje: number, data: Partial<Viaje>, user?: any) {
        return this.dataSource.transaction(async (manager) => {
            const viaje = await manager.findOne(Viaje, {
                where: { id_viaje },
                relations: ['chofer', 'tractor', 'batea'],
            });

            if (!viaje) {
                throw new NotFoundException(`Viaje ${id_viaje} no encontrado`);
            }

            // Validar cambio de Tractor
            if (data.tractor_id && data.tractor_id !== viaje.tractor_id) {
                const tractorNuevo = await manager.findOne(Tractor, { where: { tractor_id: data.tractor_id } });
                if (!tractorNuevo) throw new NotFoundException('Tractor nuevo no encontrado');
                if (tractorNuevo.estado_tractor === EstadoTractor.EN_REPARACION) {
                    throw new BadRequestException(`Tractor ${tractorNuevo.patente} en reparación`);
                }
                // Liberar viejo
                await manager.update(Tractor, { tractor_id: viaje.tractor_id }, { estado_tractor: EstadoTractor.LIBRE });
                // Ocupar nuevo
                await manager.update(Tractor, { tractor_id: tractorNuevo.tractor_id }, { estado_tractor: EstadoTractor.OCUPADO });
            }

            // Validar cambio de Batea
            if (data.batea_id && data.batea_id !== viaje.batea_id) {
                const bateaNueva = await manager.findOne(Batea, { where: { batea_id: data.batea_id } });
                if (!bateaNueva) throw new NotFoundException('Batea nueva no encontrada');
                if (bateaNueva.estado === EstadoBatea.EN_REPARACION) {
                    throw new BadRequestException(`Batea ${bateaNueva.patente} en reparación`);
                }
                // Liberar vieja
                await manager.update(Batea, { batea_id: viaje.batea_id }, { estado: EstadoBatea.VACIO });
                // Ocupar nueva
                await manager.update(Batea, { batea_id: bateaNueva.batea_id }, { estado: EstadoBatea.CARGADO });
            }

            // Validar cambio de Chofer
            if (data.chofer_id && data.chofer_id !== viaje.chofer_id) {
                const choferNuevo = await manager.findOne(Chofer, { where: { id_chofer: data.chofer_id } });
                if (!choferNuevo) throw new NotFoundException('Chofer nuevo no encontrado');
                if (choferNuevo.estado_chofer !== EstadoChofer.DISPONIBLE) {
                    throw new BadRequestException(`Chofer ${choferNuevo.nombre_completo} no está disponible`);
                }
                // Liberar viejo
                const estadosViaje = [EstadoChofer.CARGANDO, EstadoChofer.VIAJANDO, EstadoChofer.DESCANSANDO, EstadoChofer.DESCARGANDO];
                if (estadosViaje.includes(viaje.chofer.estado_chofer)) {
                    await manager.update(Chofer, { id_chofer: viaje.chofer_id }, { estado_chofer: EstadoChofer.DISPONIBLE });
                }
            }

            // Validar toneladas
            if (data.toneladas_cargadas) {
                const tractorActual = data.tractor_id ? await manager.findOne(Tractor, {where: {tractor_id: data.tractor_id}}) : viaje.tractor;
                const bateaActual = data.batea_id ? await manager.findOne(Batea, {where: {batea_id: data.batea_id}}) : viaje.batea;
                
                const capacidadTractor = tractorActual?.carga_max_tractor || 0;
                const capacidadBatea = bateaActual?.carga_max_batea || 0;
                const limiteCarga = Math.min(capacidadTractor, capacidadBatea);

                if (data.toneladas_cargadas > limiteCarga) {
                    throw new BadRequestException(
                        `Exceso de carga: La carga (${data.toneladas_cargadas}t) excede límite de ${limiteCarga}t`,
                    );
                }
            }

            Object.assign(viaje, data);
            viaje.viaje_modificado = true; // Activar notificación para el chofer

            await manager.save(viaje);

            this.logger.log(`[EDIT] Admin editó viaje ID=${id_viaje}. Notificación activada.`);
            return viaje;
        });
    }

    async marcarNotificacionLeida(id_viaje: number, user?: any) {
        const viaje = await this.viajeRepository.findOne({ where: { id_viaje } });
        if (!viaje) {
            throw new NotFoundException(`Viaje ${id_viaje} no encontrado`);
        }
        
        viaje.viaje_modificado = false;
        await this.viajeRepository.save(viaje);
        return { success: true };
    }

    async rechazar(id_viaje: number, user: any) {
        this.logger.log(`[RECHAZAR] Chofer ${user.nombre} (ID Chofer: ${user.chofer_id}) intenta rechazar viaje ID=${id_viaje}`);

        const viaje = await this.viajeRepository.findOne({
            where: { id_viaje },
            relations: ['chofer', 'tractor', 'batea'],
        });

        if (!viaje) {
            throw new NotFoundException(`El viaje con ID ${id_viaje} no existe`);
        }

        if (viaje.chofer_id !== user.chofer_id) {
            throw new BadRequestException('No puedes rechazar un viaje que no te pertenece.');
        }

        try {
            return await this.dataSource.transaction(async (manager) => {
                const chofer = viaje.chofer;
                const tractor = viaje.tractor;
                const batea = viaje.batea;

                const choferNombre = chofer ? chofer.nombre_completo : `Chofer ID ${viaje.chofer_id}`;
                const mensaje = `El chofer ${choferNombre} rechazó el viaje asignado con origen ${viaje.origen} y destino ${viaje.destino} (${viaje.toneladas_cargadas}t).`;
                
                const notificacion = manager.create(Notificacion, {
                    mensaje,
                    leida: false,
                });
                await manager.save(notificacion);
                this.logger.log(`✓ Notificación de rechazo guardada en BD: "${mensaje}"`);

                const adminEmail = 'admin@transporte.com';
                await this.mailService.sendTripRejectedEmail(adminEmail, choferNombre, {
                    origen: viaje.origen,
                    destino: viaje.destino,
                    toneladas_cargadas: viaje.toneladas_cargadas,
                }).catch(err => {
                    this.logger.error(`Error al enviar email de rechazo de viaje: ${err.message}`);
                });

                if (tractor) {
                    await manager.update(
                        Tractor,
                        { tractor_id: viaje.tractor_id },
                        { estado_tractor: EstadoTractor.LIBRE },
                    );
                    this.logger.log(`✓ Tractor ${tractor.patente} liberado (estado: LIBRE)`);
                }

                if (batea) {
                    await manager.update(
                        Batea,
                        { batea_id: viaje.batea_id },
                        { estado: EstadoBatea.VACIO },
                    );
                    this.logger.log(`✓ Batea ${batea.patente} liberada (estado: VACIO)`);
                }

                if (chofer) {
                    await manager.update(
                        Chofer,
                        { id_chofer: viaje.chofer_id },
                        { estado_chofer: EstadoChofer.DISPONIBLE },
                    );
                    this.logger.log(`✓ Chofer ${choferNombre} liberado (estado: DISPONIBLE)`);
                }

                await manager.delete(Viaje, { id_viaje });
                this.logger.log(`✓ Viaje ID=${id_viaje} eliminado de la base de datos`);

                return {
                    success: true,
                    message: 'Viaje rechazado y recursos liberados con éxito.',
                };
            });
        } catch (error) {
            this.logger.error(`[RECHAZAR] Error al rechazar viaje ID=${id_viaje}: ${error.message}`, error.stack);
            throw error;
        }
    }

    async obtenerNotificaciones() {
        return this.notificacionRepository.find({
            where: { leida: false },
            order: { creado_en: 'DESC' },
        });
    }

    async marcarNotificacionLeidaById(id: number) {
        const notif = await this.notificacionRepository.findOne({ where: { id } });
        if (!notif) {
            throw new NotFoundException(`Notificación ${id} no encontrada`);
        }
        notif.leida = true;
        await this.notificacionRepository.save(notif);
        return { success: true };
    }
}

