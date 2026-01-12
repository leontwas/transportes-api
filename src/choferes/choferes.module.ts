import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chofer } from '../entities/chofer.entity';
import { Viaje } from '../entities/viaje.entity';
import { ChoferesService } from './choferes.service';
import { ChoferesController } from './choferes.controller';
import { ChoferesSchedulerService } from './choferes-scheduler.service';
import { PeriodosDescansoModule } from '../periodos-descanso/periodos-descanso.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chofer, Viaje]),
    PeriodosDescansoModule,
  ],
  providers: [ChoferesService, ChoferesSchedulerService],
  controllers: [ChoferesController],
  exports: [ChoferesService],
})
export class ChoferesModule { }
