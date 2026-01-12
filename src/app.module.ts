import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { Chofer } from './entities/chofer.entity';
import { Tractor } from './entities/tractor.entity';
import { Batea } from './entities/batea.entity';
import { Viaje } from './entities/viaje.entity';
import { Usuario } from './entities/usuario.entity';
import { PeriodoDescanso } from './entities/periodo-descanso.entity';
import { ChoferesModule } from './choferes/choferes.module';
import { TractoresModule } from './tractores/tractores.module';
import { BateasModule } from './bateas/bateas.module';
import { ViajesModule } from './viajes/viajes.module';
import { AuthModule } from './auth/auth.module';
import { PeriodosDescansoModule } from './periodos-descanso/periodos-descanso.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'leon4475',
      database: process.env.DB_NAME || 'tractores_db',
      entities: [Chofer, Tractor, Batea, Viaje, Usuario, PeriodoDescanso],
      synchronize: true,
      logging: true,
      ssl: false, // Desactivar SSL para desarrollo local
      // Configuración adicional para mejorar la estabilidad de conexión
      extra: {
        max: 10, // Máximo de conexiones en el pool
        connectionTimeoutMillis: 10000, // Timeout de conexión
        idleTimeoutMillis: 30000, // Tiempo antes de cerrar conexiones inactivas
        keepAlive: true, // Mantener conexiones vivas
        keepAliveInitialDelayMillis: 10000,
      },
      retryAttempts: 10,
      retryDelay: 3000,
      autoLoadEntities: false,
    }),
    AuthModule,
    ChoferesModule,
    TractoresModule,
    BateasModule,
    ViajesModule,
    PeriodosDescansoModule,
  ],
})
export class AppModule { }
