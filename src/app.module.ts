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
              password: config.get<string>('DB_PASSWORD'),
              database: config.get<string>('DB_NAME', 'postgres'),
            }),
          entities: [Chofer, Tractor, Batea, Viaje, Usuario, PeriodoDescanso],
          synchronize: config.get<string>('DB_SYNC') === 'true',
          logging: !isProduction,
          // SSL requerido para Supabase
          ssl: databaseUrl || isProduction ? { rejectUnauthorized: false } : false,
          extra: {
            // Configuración optimizada para Supabase
            max: 20, // Aumentado para mejor rendimiento
            connectionTimeoutMillis: 15000,
            idleTimeoutMillis: 60000,
            statement_timeout: 30000, // Timeout de queries
          },
          retryAttempts: 10,
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
