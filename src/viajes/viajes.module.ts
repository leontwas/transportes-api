import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ViajesService } from './viajes.service';
import { ViajesController } from './viajes.controller';
import { Viaje } from '../entities/viaje.entity';
import { Chofer } from '../entities/chofer.entity';
import { Tractor } from '../entities/tractor.entity';
import { Batea } from '../entities/batea.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Viaje, Chofer, Tractor, Batea])],
    controllers: [ViajesController],
    providers: [ViajesService],
})
export class ViajesModule { }
