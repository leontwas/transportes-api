import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PeriodoDescanso } from '../entities/periodo-descanso.entity';
import { Viaje } from '../entities/viaje.entity';
import { PeriodosDescansoService } from './periodos-descanso.service';

@Module({
    imports: [TypeOrmModule.forFeature([PeriodoDescanso, Viaje])],
    providers: [PeriodosDescansoService],
    exports: [PeriodosDescansoService],
})
export class PeriodosDescansoModule { }
