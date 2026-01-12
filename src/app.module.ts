import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        const isProduction = config.get<string>('NODE_ENV') === 'production';

        return {
          type: 'postgres',
          ...(databaseUrl
            ? { url: databaseUrl }
            : {
              host: config.get<string>('DB_HOST', 'localhost'),
              port: config.get<number>('DB_PORT', 5432),
              username: config.get<string>('DB_USER', config.get<string>('DB_USERNAME', 'postgres')),
              password: config.get<string>('DB_PASSWORD', 'leon4475'),
              database: config.get<string>('DB_NAME', 'tractores_db'),
            }),
          entities: [Chofer, Tractor, Batea, Viaje, Usuario, PeriodoDescanso],
          synchronize: config.get<string>('DB_SYNC') === 'true' || !isProduction,
          logging: !isProduction,
          ssl: isProduction ? { rejectUnauthorized: false } : false,
          extra: {
            max: 10,
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
          },
          retryAttempts: 5,
          retryDelay: 3000,
        };
      },
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
