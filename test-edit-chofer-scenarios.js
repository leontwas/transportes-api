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

async function testEditChoferScenarios() {
  console.log('═══════════════════════════════════════════════════');
  console.log('    🧪 TEST: EDICIÓN DE CHOFER - MÚLTIPLES ESCENARIOS');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Get chofer 1 info
    const getChofer = await makeRequest('GET', '/api/v1/choferes/1');
    if (getChofer.status !== 200) {
      console.log('❌ No se pudo obtener chofer ID 1');
      return;
    }

    const choferOriginal = getChofer.data;
    console.log('📋 Estado inicial del Chofer ID 1:');
    console.log(`   Nombre: ${choferOriginal.nombre_completo}`);
    console.log(`   Estado: ${choferOriginal.estado_chofer}`);
    console.log(`   Tractor: ${choferOriginal.tractor_id || 'ninguno'}`);
    console.log(`   Batea: ${choferOriginal.batea_id || 'ninguna'}\n`);

    // Test 1: Solo cambiar nombre
    console.log('📝 Test 1: Cambiar solo el nombre...');
    const test1 = await makeRequest('PATCH', '/api/v1/choferes/1', {
      nombre_completo: 'Nombre Test 1',
    });

    if (test1.status === 200) {
      console.log('   ✅ Éxito\n');
    } else {
      console.log(`   ❌ Error ${test1.status}:`);
      console.log('   ', JSON.stringify(test1.data, null, 2), '\n');
      return;
    }

    // Test 2: Cambiar estado a franco
    console.log('📝 Test 2: Cambiar estado a franco...');
    const test2 = await makeRequest('PATCH', '/api/v1/choferes/1', {
      estado_chofer: 'franco',
    });

    if (test2.status === 200) {
      console.log('   ✅ Éxito\n');
    } else {
      console.log(`   ❌ Error ${test2.status}:`);
      console.log('   ', JSON.stringify(test2.data, null, 2), '\n');
    }

    // Test 3: Cambiar estado de vuelta a activo
    console.log('📝 Test 3: Cambiar estado a activo...');
    const test3 = await makeRequest('PATCH', '/api/v1/choferes/1', {
      estado_chofer: 'activo',
    });

    if (test3.status === 200) {
      console.log('   ✅ Éxito\n');
    } else {
      console.log(`   ❌ Error ${test3.status}:`);
      console.log('   ', JSON.stringify(test3.data, null, 2), '\n');
    }

    // Test 4: Cambiar nombre y estado juntos
    console.log('📝 Test 4: Cambiar nombre y estado juntos...');
    const test4 = await makeRequest('PATCH', '/api/v1/choferes/1', {
      nombre_completo: 'Nombre Test 2',
      estado_chofer: 'activo',
    });

    if (test4.status === 200) {
      console.log('   ✅ Éxito\n');
    } else {
      console.log(`   ❌ Error ${test4.status}:`);
      console.log('   ', JSON.stringify(test4.data, null, 2), '\n');
    }

    // Test 5: Enviar solo estado sin cambios (mismo estado)
    console.log('📝 Test 5: Enviar mismo estado (sin cambios reales)...');
    const test5 = await makeRequest('PATCH', '/api/v1/choferes/1', {
      estado_chofer: 'activo',
    });

    if (test5.status === 200) {
      console.log('   ✅ Éxito\n');
    } else {
      console.log(`   ❌ Error ${test5.status}:`);
      console.log('   ', JSON.stringify(test5.data, null, 2), '\n');
    }

    // Test 6: Actualizar con nombre, estado, tractor_id y batea_id
    console.log('📝 Test 6: Actualizar nombre, estado y relaciones...');
    const test6 = await makeRequest('PATCH', '/api/v1/choferes/1', {
      nombre_completo: 'Nombre Test Completo',
      estado_chofer: 'activo',
      tractor_id: choferOriginal.tractor_id,
      batea_id: choferOriginal.batea_id,
    });

    if (test6.status === 200) {
      console.log('   ✅ Éxito\n');
    } else {
      console.log(`   ❌ Error ${test6.status}:`);
      console.log('   ', JSON.stringify(test6.data, null, 2), '\n');
    }

    // Restore original name
    console.log('📝 Restaurando nombre original...');
    await makeRequest('PATCH', '/api/v1/choferes/1', {
      nombre_completo: choferOriginal.nombre_completo,
    });
    console.log('   ✅ Restaurado\n');

    console.log('═══════════════════════════════════════════════════');
    console.log('    ✅ TODOS LOS TESTS COMPLETADOS');
    console.log('═══════════════════════════════════════════════════\n');

    console.log('💡 Si el problema persiste, por favor proporciona:');
    console.log('   1. El mensaje de error exacto que ves');
    console.log('   2. Desde dónde estás editando (frontend, Postman, etc.)');
    console.log('   3. Qué campos específicamente estás intentando cambiar\n');
  } catch (error) {
    console.log('❌ Error en el test:', error.message);
  }
}

testEditChoferScenarios();
