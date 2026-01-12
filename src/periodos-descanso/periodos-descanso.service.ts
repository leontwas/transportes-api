import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { PeriodoDescanso } from '../entities/periodo-descanso.entity';
import { Viaje } from '../entities/viaje.entity';

@Injectable()
export class PeriodosDescansoService {
    private readonly logger = new Logger(PeriodosDescansoService.name);

    constructor(
        @InjectRepository(PeriodoDescanso)
        private periodoRepository: Repository<PeriodoDescanso>,
        @InjectRepository(Viaje)
        private viajeRepository: Repository<Viaje>,
    ) {
        this.logger.log('✓ Servicio de Períodos de Descanso inicializado');
    }

    /**
     * Crear nuevo período cuando el chofer comienza a descansar
     */
    async iniciarPeriodo(viaje_id: number): Promise<PeriodoDescanso> {
        // Verificar que no haya otro período abierto
        const periodoAbierto = await this.periodoRepository.findOne({
            where: { viaje_id, fin_descanso: IsNull() },
            order: { creado_en: 'DESC' },
        });

        if (periodoAbierto) {
            this.logger.warn(
                `Ya existe un período de descanso abierto para el viaje ${viaje_id}. Cerrándolo automáticamente.`,
            );
            // Cerrar el período anterior automáticamente
            await this.finalizarPeriodo(viaje_id);
        }

        const nuevoPeriodo = this.periodoRepository.create({
            viaje_id,
            inicio_descanso: new Date(),
        });

        const periodoGuardado = await this.periodoRepository.save(nuevoPeriodo);
        this.logger.log(
            `✓ Período de descanso ${periodoGuardado.id_periodo} iniciado para viaje ${viaje_id}`,
        );

        return periodoGuardado;
    }

    /**
     * Finalizar período actual y actualizar horas acumuladas del viaje
     */
    async finalizarPeriodo(viaje_id: number): Promise<void> {
        // Buscar período abierto
        const periodoAbierto = await this.periodoRepository.findOne({
            where: { viaje_id, fin_descanso: IsNull() },
            order: { creado_en: 'DESC' },
        });

        if (!periodoAbierto) {
            throw new BadRequestException(
                `No hay período de descanso abierto para el viaje ${viaje_id}`,
            );
        }

        const ahora = new Date();
        const horasDescansadas = this.calcularHoras(
            periodoAbierto.inicio_descanso,
            ahora,
        );

        // Actualizar el período
        await this.periodoRepository.update(periodoAbierto.id_periodo, {
            fin_descanso: ahora,
            horas_calculadas: horasDescansadas,
            actualizado_en: new Date(),
        });

        this.logger.log(
            `✓ Período de descanso ${periodoAbierto.id_periodo} finalizado: ${horasDescansadas} horas`,
        );

        // Actualizar total acumulado en el viaje
        await this.actualizarHorasAcumuladas(viaje_id);
    }

    /**
     * Recalcular y actualizar horas acumuladas del viaje
     */
    async actualizarHorasAcumuladas(viaje_id: number): Promise<void> {
        const periodos = await this.periodoRepository.find({
            where: { viaje_id },
        });

        const totalHoras = periodos.reduce(
            (sum, p) => sum + Number(p.horas_calculadas || 0),
            0,
        );

        await this.viajeRepository.update(viaje_id, {
            horas_descansadas: totalHoras,
        });

        this.logger.log(
            `✓ Viaje ${viaje_id}: horas acumuladas actualizadas a ${totalHoras}`,
        );
    }

    /**
     * Calcular horas entre dos fechas
     */
    private calcularHoras(inicio: Date, fin: Date): number {
        const milisegundos = fin.getTime() - inicio.getTime();
        const horas = milisegundos / (1000 * 60 * 60);
        return Math.round(horas * 100) / 100; // 2 decimales
    }

    /**
     * Obtener todos los períodos de un viaje
     */
    async obtenerPorViaje(viaje_id: number): Promise<PeriodoDescanso[]> {
        return this.periodoRepository.find({
            where: { viaje_id },
            order: { creado_en: 'ASC' },
        });
    }

    /**
     * Verificar si un viaje tiene al menos un período de descanso completo
     */
    async tieneDescansoCompleto(viaje_id: number): Promise<boolean> {
        const periodosCompletos = await this.periodoRepository.find({
            where: { viaje_id },
        });

        return periodosCompletos.some((p) => p.fin_descanso !== null);
    }
}
