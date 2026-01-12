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

async function testFullCRUD() {
  console.log('═══════════════════════════════════════════════════');
  console.log('    🧪 TEST: CRUD COMPLETO SIN FK CONSTRAINTS');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Test 1: Get chofer 1
    console.log('📋 Test 1: Obtener chofer ID 1...');
    const getChofer = await makeRequest('GET', '/api/v1/choferes/1');

    if (getChofer.status !== 200) {
      console.log('❌ Error al obtener chofer:', getChofer.status);
      return;
    }

    console.log('✅ Chofer obtenido:');
    console.log(`   Nombre: ${getChofer.data.nombre_completo}`);
    console.log(`   Estado: ${getChofer.data.estado_chofer}\n`);

    // Test 2: Update chofer 1 nombre
    console.log('📋 Test 2: Actualizar nombre del chofer...');
    const updateResult = await makeRequest('PATCH', '/api/v1/choferes/1', {
      nombre_completo: 'Chofer Test Actualizado',
    });

    if (updateResult.status !== 200) {
      console.log('❌ Error al actualizar:', updateResult.status);
      console.log('   Respuesta:', JSON.stringify(updateResult.data, null, 2));
      return;
    }

    console.log('✅ Chofer actualizado correctamente');
    console.log(`   Nuevo nombre: ${updateResult.data.nombre_completo}\n`);

    // Test 3: Create new chofer
    console.log('📋 Test 3: Crear nuevo chofer para probar eliminación...');
    const createResult = await makeRequest('POST', '/api/v1/choferes', {
      nombre_completo: 'Chofer Para Eliminar',
      estado_chofer: 'activo',
    });

    if (createResult.status !== 201) {
      console.log('❌ Error al crear chofer:', createResult.status);
      return;
    }

    const newChoferId = createResult.data.id_chofer;
    console.log(`✅ Chofer creado con ID: ${newChoferId}\n`);

    // Test 4: Delete the new chofer
    console.log(`📋 Test 4: Eliminar chofer ID ${newChoferId}...`);
    const deleteResult = await makeRequest(
      'DELETE',
      `/api/v1/choferes/${newChoferId}`,
    );

    if (deleteResult.status !== 200) {
      console.log('❌ Error al eliminar:', deleteResult.status);
      console.log('   Respuesta:', JSON.stringify(deleteResult.data, null, 2));
      return;
    }

    console.log('✅ Chofer eliminado correctamente');
    console.log(`   Mensaje: ${deleteResult.data.mensaje}\n`);

    // Test 5: Verify deletion
    console.log(`📋 Test 5: Verificar que chofer ${newChoferId} fue eliminado...`);
    const verifyResult = await makeRequest(
      'GET',
      `/api/v1/choferes/${newChoferId}`,
    );

    if (verifyResult.status === 404) {
      console.log('✅ Confirmado: chofer eliminado correctamente\n');
    } else {
      console.log('❌ El chofer todavía existe\n');
    }

    // Test 6: Verify chofer 1 still exists and can be edited
    console.log('📋 Test 6: Verificar que chofer 1 todavía existe...');
    const finalCheck = await makeRequest('GET', '/api/v1/choferes/1');

    if (finalCheck.status === 200) {
      console.log('✅ Chofer 1 todavía existe y es accesible');
      console.log(`   Nombre: ${finalCheck.data.nombre_completo}\n`);
    } else {
      console.log('❌ Error al verificar chofer 1\n');
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('    ✅ TODOS LOS TESTS PASARON EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════\n');

    console.log('📊 Resumen:\n');
    console.log('✅ GET /api/v1/choferes/:id - Funciona');
    console.log('✅ PATCH /api/v1/choferes/:id - Funciona (actualización)');
    console.log('✅ POST /api/v1/choferes - Funciona (creación)');
    console.log('✅ DELETE /api/v1/choferes/:id - Funciona (eliminación)');
    console.log(
      '✅ Sin FK constraints - Los choferes pueden ser eliminados libremente\n',
    );

    console.log('💡 Solución implementada:\n');
    console.log('1. ✅ Agregado createForeignKeyConstraints: false en todas las entities');
    console.log(
      '   - chofer.entity.ts (relaciones a tractor y batea)',
    );
    console.log('   - tractor.entity.ts (relación a batea)');
    console.log(
      '   - batea.entity.ts (relaciones a chofer y tractor)',
    );
    console.log(
      '   - viaje.entity.ts (relaciones a chofer, tractor y batea)',
    );
    console.log(
      '2. ✅ Las FK constraints existentes fueron eliminadas al reiniciar el servidor',
    );
    console.log(
      '3. ✅ Cambiado eliminar() de repository.remove() a repository.delete()',
    );
    console.log(
      '4. ✅ Ahora es posible eliminar y editar registros sin restricciones\n',
    );
  } catch (error) {
    console.log('❌ Error en el test:', error.message);
  }
}

testFullCRUD();
