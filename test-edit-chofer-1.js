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

async function testEditChofer1() {
  console.log('═══════════════════════════════════════════════════');
  console.log('    🧪 TEST: EDITAR CHOFER ID 1');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Paso 1: Obtener chofer 1
    console.log('📋 Paso 1: Obtener información actual del chofer ID 1...');
    const getChofer = await makeRequest('GET', '/api/v1/choferes/1');

    if (getChofer.status !== 200) {
      console.log('❌ Error al obtener chofer:', getChofer.status);
      console.log('   Respuesta:', JSON.stringify(getChofer.data, null, 2));
      return;
    }

    console.log('✅ Chofer obtenido:');
    console.log(`   ID: ${getChofer.data.id_chofer}`);
    console.log(`   Nombre actual: ${getChofer.data.nombre_completo}`);
    console.log(`   Estado: ${getChofer.data.estado_chofer}`);
    console.log(`   Tractor: ${getChofer.data.tractor_id || 'ninguno'}`);
    console.log(`   Batea: ${getChofer.data.batea_id || 'ninguna'}\n`);

    // Paso 2: Intentar actualizar solo el nombre
    console.log('📋 Paso 2: Intentar actualizar solo el nombre...');
    const updateResult = await makeRequest('PATCH', '/api/v1/choferes/1', {
      nombre_completo: 'Juan Pérez Actualizado',
    });

    if (updateResult.status !== 200) {
      console.log('❌ Error al actualizar chofer:');
      console.log(`   Status: ${updateResult.status}`);
      console.log('   Respuesta:', JSON.stringify(updateResult.data, null, 2));
      console.log('');

      // Mostrar más detalles del error
      if (updateResult.data.message) {
        console.log('📝 Mensaje de error:');
        console.log(`   ${updateResult.data.message}\n`);
      }

      if (updateResult.data.statusCode === 500) {
        console.log('⚠️  Error 500: Internal Server Error');
        console.log('   Esto indica un error en el servidor\n');
      }

      return;
    }

    console.log('✅ Chofer actualizado correctamente!');
    console.log(`   Nuevo nombre: ${updateResult.data.nombre_completo}\n`);

    // Paso 3: Verificar que se actualizó
    console.log('📋 Paso 3: Verificar actualización...');
    const verifyResult = await makeRequest('GET', '/api/v1/choferes/1');

    if (verifyResult.status === 200) {
      console.log('✅ Verificación exitosa:');
      console.log(`   Nombre: ${verifyResult.data.nombre_completo}\n`);
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('    ✅ TEST COMPLETADO EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════');
  } catch (error) {
    console.log('❌ Error en el test:', error.message);
    if (error.stack) {
      console.log('\n   Stack trace:');
      console.log(error.stack);
    }
  }
}

testEditChofer1();
