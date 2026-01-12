import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tractor } from '../entities/tractor.entity';
import { TractoresService } from './tractores.service';
import { TractoresController } from './tractores.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tractor])],
  providers: [TractoresService],
  controllers: [TractoresController],
  exports: [TractoresService],
})
export class TractoresModule {}
