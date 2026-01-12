import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Batea } from '../entities/batea.entity';
import { BateasService } from './bateas.service';
import { BateasController } from './bateas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Batea])],
  providers: [BateasService],
  controllers: [BateasController],
  exports: [BateasService],
})
export class BateasModule {}
