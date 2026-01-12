import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Chofer, EstadoChofer } from '../entities/chofer.entity';

@Injectable()
export class ChoferesSchedulerService {
  private readonly logger = new Logger(ChoferesSchedulerService.name);

  constructor(
    @InjectRepository(Chofer)
    private choferRepository: Repository<Chofer>,
  ) {}

  /**
   * Cron Job que se ejecuta cada hora para verificar estados vencidos
   * Revisa si hay choferes en FRANCO o LICENCIA_ANUAL cuya fecha de fin ya pasó
   * y los cambia automáticamente a DISPONIBLE
   */
  @Cron(CronExpression.EVERY_HOUR)
  async verificarEstadosVencidos() {
    this.logger.log('🔍 Iniciando verificación de estados vencidos...');

    try {
      const ahora = new Date();

      // Buscar choferes en FRANCO o LICENCIA_ANUAL con fecha de fin vencida
      const choferesVencidos = await this.choferRepository.find({
        where: [
          {
            estado_chofer: EstadoChofer.FRANCO,
            fecha_fin_licencia: LessThanOrEqual(ahora),
          },
          {
            estado_chofer: EstadoChofer.LICENCIA_ANUAL,
            fecha_fin_licencia: LessThanOrEqual(ahora),
          },
        ],
      });

      if (choferesVencidos.length === 0) {
        this.logger.log('✓ No hay estados vencidos para actualizar');
        return;
      }

      this.logger.log(
        `📋 Encontrados ${choferesVencidos.length} chofer(es) con estados vencidos`,
      );

      // Actualizar cada chofer a DISPONIBLE
      for (const chofer of choferesVencidos) {
        const estadoAnterior = chofer.estado_chofer;
        const razonAnterior = chofer.razon_estado;

        await this.choferRepository.update(
          { id_chofer: chofer.id_chofer },
          {
            estado_chofer: EstadoChofer.DISPONIBLE,
            razon_estado: `Cambio automático: ${estadoAnterior} finalizado`,
            fecha_inicio_licencia: null as any,
            fecha_fin_licencia: null as any,
            ultimo_estado_en: new Date(),
          },
        );

        this.logger.log(
          `✅ Chofer ${chofer.nombre_completo} (ID: ${chofer.id_chofer}): ${estadoAnterior} → DISPONIBLE`,
        );
        this.logger.debug(
          `   Razón anterior: ${razonAnterior || 'N/A'}, Fecha fin: ${chofer.fecha_fin_licencia}`,
        );
      }

      this.logger.log(
        `✓ Actualización completa: ${choferesVencidos.length} chofer(es) ahora DISPONIBLE`,
      );
    } catch (error) {
      this.logger.error('❌ Error al verificar estados vencidos:', error.message);
      this.logger.error(error.stack);
    }
  }

  /**
   * Método manual para forzar la verificación (útil para testing)
   */
  async verificarAhora() {
    this.logger.log('🔄 Verificación manual iniciada...');
    await this.verificarEstadosVencidos();
  }
}