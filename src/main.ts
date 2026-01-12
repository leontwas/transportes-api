import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as os from 'os';

function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      // Buscar IPv4 que no sea loopback y que esté en red local
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina propiedades que no están en el DTO
      forbidNonWhitelisted: true, // Lanza error si hay propiedades extra
      transform: true, // Transforma automáticamente los payloads a instancias de DTO
    }),
  );

  // Agregar CORS
  app.enableCors({
    origin: '*', // Permite todas las URLs (para desarrollo)
    credentials: true,
  });

  const port = 3000;
  const host = '0.0.0.0'; // Escuchar en todas las interfaces
  const localIP = getLocalIP();

  await app.listen(port, host);

  console.log('\n' + '═'.repeat(60));
  console.log('  ✅ SERVIDOR INICIADO CORRECTAMENTE');
  console.log('═'.repeat(60));
  console.log('\n📡 El servidor está escuchando en:\n');
  console.log(`   • Local:      http://localhost:${port}`);
  console.log(`   • Red local:  http://${localIP}:${port}`);
  console.log('\n💡 Usa la IP de red local para conectar desde tu teléfono/tablet');
  console.log(`   Configura el frontend con: http://${localIP}:${port}\n`);
  console.log('═'.repeat(60) + '\n');
}
void bootstrap();
