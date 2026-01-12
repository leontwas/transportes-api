const os = require('os');
const http = require('http');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  const ips = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      // IPv4 que no sea loopback
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({
          interface: name,
          ip: iface.address,
          mac: iface.mac,
        });
      }
    }
  }

  return ips;
}

async function checkServerStatus(ip, port) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: ip,
        port: port,
        path: '/api/v1/choferes',
        method: 'GET',
        timeout: 2000,
      },
      (res) => {
        resolve(res.statusCode === 200);
      },
    );

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log('  🔍 VERIFICACIÓN DE RED Y CONFIGURACIÓN');
  console.log('═'.repeat(70) + '\n');

  const ips = getLocalIP();

  if (ips.length === 0) {
    console.log('❌ No se encontraron interfaces de red activas\n');
    console.log('💡 Verifica que estés conectado a una red WiFi\n');
    return;
  }

  console.log('📡 Interfaces de red detectadas:\n');

  let primaryIP = null;

  for (const info of ips) {
    console.log(`   • ${info.interface}`);
    console.log(`     IP: ${info.ip}`);
    console.log(`     MAC: ${info.mac}`);

    // La primera IP WiFi o Ethernet es usualmente la principal
    if (!primaryIP && (info.interface.includes('Wi-Fi') || info.interface.includes('Ethernet'))) {
      primaryIP = info.ip;
      console.log('     ⭐ PRINCIPAL (usar esta)');
    }

    console.log('');
  }

  if (!primaryIP && ips.length > 0) {
    primaryIP = ips[0].ip;
  }

  console.log('═'.repeat(70) + '\n');

  console.log('🎯 CONFIGURACIÓN RECOMENDADA PARA TU FRONTEND:\n');
  console.log(`   API_URL: http://${primaryIP}:3000\n`);

  console.log('📋 Pasos a seguir:\n');
  console.log(`   1. En tu proyecto frontend, busca el archivo de configuración`);
  console.log(`      (config.ts, constants.ts, o .env)\n`);
  console.log(`   2. Actualiza la URL del API a:`);
  console.log(`      API_URL = "http://${primaryIP}:3000"\n`);
  console.log(`   3. Reinicia tu aplicación frontend\n`);

  console.log('═'.repeat(70) + '\n');

  // Check if server is running
  console.log('🔍 Verificando si el servidor está corriendo...\n');

  const isRunning = await checkServerStatus(primaryIP, 3000);

  if (isRunning) {
    console.log(`✅ Servidor ACTIVO en http://${primaryIP}:3000\n`);
    console.log('   Puedes acceder desde cualquier dispositivo en la misma red\n');
  } else {
    console.log(`❌ Servidor NO detectado en http://${primaryIP}:3000\n`);
    console.log('   💡 Para iniciar el servidor, ejecuta:\n');
    console.log('      npm run start:dev\n');
  }

  console.log('═'.repeat(70) + '\n');

  // Additional tips
  console.log('💡 TIPS ADICIONALES:\n');
  console.log('   • Asegúrate de que tu PC y teléfono estén en la misma red WiFi');
  console.log('   • Si el firewall bloquea la conexión, agrega una excepción');
  console.log('     para el puerto 3000');
  console.log('   • En Windows, ejecuta como administrador si hay problemas:');
  console.log('     netsh advfirewall firewall add rule name="Node 3000"');
  console.log('     dir=in action=allow protocol=TCP localport=3000\n');

  console.log('═'.repeat(70) + '\n');
}

main().catch(console.error);
