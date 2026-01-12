const http = require('http');

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => (responseData += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testDeleteRealChofer() {
  console.log('═══════════════════════════════════════════════════');
  console.log('    🧪 TEST: ELIMINAR CHOFER ID 4');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    console.log('📋 Paso 1: Verificar chofer ID 4...');
    const getChofer = await makeRequest('GET', '/api/v1/choferes/4');

    if (getChofer.status === 200) {
      console.log('✅ Chofer encontrado:');
      console.log(`   Nombre: ${getChofer.data.nombre_completo}`);
      console.log(`   Estado: ${getChofer.data.estado_chofer}`);
      console.log(`   Tractor: ${getChofer.data.tractor_id || 'ninguno'}`);
      console.log(`   Batea: ${getChofer.data.batea_id || 'ninguna'}\n`);
    }

    console.log('📋 Paso 2: Intentar eliminar chofer ID 4...');
    const deleteResult = await makeRequest('DELETE', '/api/v1/choferes/4');

    if (deleteResult.status === 200) {
      console.log('✅ Eliminación exitosa!');
      console.log('   ', JSON.stringify(deleteResult.data, null, 2), '\n');
    } else {
      console.log(`❌ Error al eliminar (Status ${deleteResult.status}):`);
      console.log('   ', JSON.stringify(deleteResult.data, null, 2), '\n');
    }

    console.log('📋 Paso 3: Verificar que el chofer fue eliminado...');
    const checkDeleted = await makeRequest('GET', '/api/v1/choferes/4');

    if (checkDeleted.status === 404) {
      console.log('✅ Confirmado: el chofer ya no existe\n');
    } else {
      console.log('⚠️  El chofer todavía existe\n');
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('    ✅ TEST COMPLETADO');
    console.log('═══════════════════════════════════════════════════\n');

  } catch (error) {
    console.log('❌ Error en el test:', error.message);
  }
}

testDeleteRealChofer();
