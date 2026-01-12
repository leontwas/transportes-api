const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';

async function debugDeleteViaje() {
  try {
    console.log('🔍 DIAGNÓSTICO: DELETE /api/v1/viajes/:id_viaje\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    // 1. Login como Admin
    console.log('1️⃣  Login como Admin...');
    const loginAdmin = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@transporte.com',
      password: 'admin123',
    });
    const adminToken = loginAdmin.data.access_token;
    console.log(`   ✓ Token obtenido\n`);

    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // 2. Obtener todos los viajes
    console.log('2️⃣  Obteniendo lista de viajes...');
    const viajes = await axios.get(`${API_URL}/viajes`, { headers: adminHeaders });

    if (viajes.data.length === 0) {
      console.log('   ⚠️  No hay viajes en el sistema\n');
      return;
    }

    console.log(`   ✓ Hay ${viajes.data.length} viaje(s) en el sistema\n`);

    // Mostrar todos los viajes con detalles
    viajes.data.forEach((v, idx) => {
      console.log(`   📦 Viaje ${idx + 1}:`);
      console.log(`      - ID: ${v.id_viaje}`);
      console.log(`      - Estado: ${v.estado_viaje}`);
      console.log(`      - Origen: ${v.origen} → Destino: ${v.destino}`);
      console.log(`      - Chofer: ${v.chofer?.nombre_completo || 'N/A'} (Estado: ${v.chofer?.estado_chofer || 'N/A'})`);
      console.log(`      - Tractor: ${v.tractor?.patente || 'N/A'} (Estado: ${v.tractor?.estado_tractor || 'N/A'})`);
      console.log(`      - Batea: ${v.batea?.patente || 'N/A'} (Estado: ${v.batea?.estado || 'N/A'})`);
      console.log('');
    });

    // 3. Intentar eliminar el primer viaje
    const viajeAEliminar = viajes.data[0];
    console.log(`3️⃣  Intentando eliminar viaje ID=${viajeAEliminar.id_viaje}...\n`);

    try {
      const resultado = await axios.delete(
        `${API_URL}/viajes/${viajeAEliminar.id_viaje}`,
        { headers: adminHeaders }
      );

      console.log('   ✅ ELIMINACIÓN EXITOSA');
      console.log(`      Mensaje: ${resultado.data.message}`);
      console.log('      Recursos liberados:');
      if (resultado.data.recursos_liberados.chofer) {
        console.log(`        • Chofer: ${resultado.data.recursos_liberados.chofer.nombre} → ${resultado.data.recursos_liberados.chofer.nuevo_estado}`);
      }
      if (resultado.data.recursos_liberados.tractor) {
        console.log(`        • Tractor: ${resultado.data.recursos_liberados.tractor.patente} → ${resultado.data.recursos_liberados.tractor.nuevo_estado}`);
      }
      if (resultado.data.recursos_liberados.batea) {
        console.log(`        • Batea: ${resultado.data.recursos_liberados.batea.patente} → ${resultado.data.recursos_liberados.batea.nuevo_estado}`);
      }
      console.log('');

    } catch (deleteError) {
      console.log('   ❌ ERROR AL ELIMINAR\n');

      if (deleteError.response) {
        console.log('   📊 DETALLES DEL ERROR:');
        console.log(`      Status: ${deleteError.response.status}`);
        console.log(`      Status Text: ${deleteError.response.statusText}`);
        console.log(`      Datos de error:`, JSON.stringify(deleteError.response.data, null, 6));
        console.log('');

        // Análisis específico del error
        if (deleteError.response.status === 400) {
          console.log('   🔍 ANÁLISIS DEL ERROR 400:');
          console.log('      Este error indica que el servidor rechazó la petición.');
          console.log('      Causas posibles:');
          console.log('      - Validación de datos fallida');
          console.log('      - Restricción de base de datos (FK, constraint)');
          console.log('      - Estado inválido de recursos');
          console.log('      - ParseIntPipe falló al convertir el ID');
          console.log('');

          console.log('   💡 VERIFICACIÓN DE DATOS:');
          console.log(`      - ID del viaje: ${viajeAEliminar.id_viaje} (tipo: ${typeof viajeAEliminar.id_viaje})`);
          console.log(`      - ¿Es un número? ${Number.isInteger(viajeAEliminar.id_viaje)}`);
          console.log(`      - URL llamada: DELETE ${API_URL}/viajes/${viajeAEliminar.id_viaje}`);
          console.log('');
        }

      } else if (deleteError.request) {
        console.log('   ⚠️  No se recibió respuesta del servidor');
        console.log('      El servidor puede estar caído o no responder');
      } else {
        console.log('   ⚠️  Error al configurar la petición');
        console.log(`      ${deleteError.message}`);
      }

      console.log('\n   🔧 LOGS DEL SERVIDOR:');
      console.log('      Revisa la consola del servidor NestJS para más detalles.');
      console.log('      Busca líneas con [ExceptionsHandler] o [ViajesService]');
    }

    console.log('\n═══════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('\n❌ Error general en el script:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Datos:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`   ${error.message}`);
    }
  }
}

debugDeleteViaje();
