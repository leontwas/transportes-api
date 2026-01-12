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

async function testDeleteChofer() {
  console.log('═══════════════════════════════════════════════════');
  console.log('    🧪 TEST: ELIMINAR Y ACTUALIZAR CHOFER');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Listar todos los choferes
    console.log('📋 Paso 1: Listar todos los choferes...');
    const listChoferes = await makeRequest('GET', '/api/v1/choferes');
    console.log(`✅ ${listChoferes.data.length} choferes encontrados\n`);

    listChoferes.data.forEach((c) => {
      console.log(
        `   ID: ${c.id_chofer} - ${c.nombre_completo} (${c.estado_chofer})`,
      );
      console.log(
        `        Tractor: ${c.tractor_id || 'ninguno'}, Batea: ${c.batea_id || 'ninguna'}`,
      );
    });

    console.log('\n📋 Paso 2: Intentar actualizar el chofer con ID 1...');
    const updateResult = await makeRequest('PATCH', '/api/v1/choferes/1', {
      nombre_completo: 'Chofer Actualizado Test',
    });

    if (updateResult.status === 200) {
      console.log('✅ Actualización exitosa!');
      console.log(
        `   Nombre actualizado: ${updateResult.data.nombre_completo}\n`,
      );
    } else {
      console.log(
        `❌ Error al actualizar (Status ${updateResult.status}):`,
      );
      console.log('   ', JSON.stringify(updateResult.data, null, 2), '\n');
    }

    console.log('📋 Paso 3: Intentar eliminar el chofer con ID 2...');
    const deleteResult = await makeRequest('DELETE', '/api/v1/choferes/2');

    if (deleteResult.status === 200) {
      console.log('✅ Eliminación exitosa!');
      console.log('   ', JSON.stringify(deleteResult.data, null, 2), '\n');
    } else {
      console.log(`❌ Error al eliminar (Status ${deleteResult.status}):`);
      console.log('   ', JSON.stringify(deleteResult.data, null, 2), '\n');
    }

    console.log('📋 Paso 4: Verificar lista de choferes...');
    const listAfter = await makeRequest('GET', '/api/v1/choferes');
    console.log(`✅ ${listAfter.data.length} choferes restantes\n`);

    listAfter.data.forEach((c) => {
      console.log(
        `   ID: ${c.id_chofer} - ${c.nombre_completo} (${c.estado_chofer})`,
      );
    });

    console.log('\n═══════════════════════════════════════════════════');
    console.log('    📊 RESUMEN');
    console.log('═══════════════════════════════════════════════════\n');

    const updateOk = updateResult.status === 200;
    const deleteOk = deleteResult.status === 200;

    console.log(`Actualización: ${updateOk ? '✅ FUNCIONÓ' : '❌ FALLÓ'}`);
    console.log(`Eliminación: ${deleteOk ? '✅ FUNCIONÓ' : '❌ FALLÓ'}\n`);

    if (updateOk && deleteOk) {
      console.log('✅ AMBAS OPERACIONES FUNCIONAN CORRECTAMENTE\n');
    } else {
      console.log('⚠️  HAY PROBLEMAS CON LAS OPERACIONES\n');
    }
  } catch (error) {
    console.log('❌ Error en el test:', error.message);
    console.log(error.stack);
  }
}

testDeleteChofer();
