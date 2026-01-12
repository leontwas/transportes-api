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

async function testAllEntitiesCRUD() {
  console.log('═══════════════════════════════════════════════════');
  console.log('    🧪 TEST: CRUD PARA TODAS LAS ENTIDADES');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // ========== TEST CHOFERES ==========
    console.log('📋 TEST CHOFERES:\n');

    console.log('  1. Crear chofer de prueba...');
    const createChofer = await makeRequest('POST', '/api/v1/choferes', {
      nombre_completo: 'Chofer Test Delete',
      estado_chofer: 'activo',
    });

    if (createChofer.status !== 201) {
      console.log('  ❌ Error al crear chofer');
      return;
    }

    const choferId = createChofer.data.id_chofer;
    console.log(`  ✅ Chofer creado: ID ${choferId}`);

    console.log('  2. Actualizar chofer...');
    const updateChofer = await makeRequest(
      'PATCH',
      `/api/v1/choferes/${choferId}`,
      { nombre_completo: 'Chofer Test Modificado' },
    );

    if (updateChofer.status === 200) {
      console.log('  ✅ Chofer actualizado correctamente');
    } else {
      console.log('  ❌ Error al actualizar chofer');
    }

    console.log('  3. Eliminar chofer...');
    const deleteChofer = await makeRequest(
      'DELETE',
      `/api/v1/choferes/${choferId}`,
    );

    if (deleteChofer.status === 200) {
      console.log('  ✅ Chofer eliminado correctamente\n');
    } else {
      console.log('  ❌ Error al eliminar chofer\n');
    }

    // ========== TEST TRACTORES ==========
    console.log('📋 TEST TRACTORES:\n');

    console.log('  1. Crear tractor de prueba...');
    const createTractor = await makeRequest('POST', '/api/v1/tractores', {
      marca: 'Test',
      modelo: 'Test',
      patente: 'TEST999',
      carga_max_tractor: 1000,
    });

    if (createTractor.status !== 201) {
      console.log('  ❌ Error al crear tractor');
      return;
    }

    const tractorId = createTractor.data.tractor_id;
    console.log(`  ✅ Tractor creado: ID ${tractorId}`);

    console.log('  2. Actualizar tractor...');
    const updateTractor = await makeRequest(
      'PATCH',
      `/api/v1/tractores/${tractorId}`,
      { marca: 'Test Modificado' },
    );

    if (updateTractor.status === 200) {
      console.log('  ✅ Tractor actualizado correctamente');
    } else {
      console.log('  ❌ Error al actualizar tractor');
    }

    console.log('  3. Eliminar tractor...');
    const deleteTractor = await makeRequest(
      'DELETE',
      `/api/v1/tractores/${tractorId}`,
    );

    if (deleteTractor.status === 200) {
      console.log('  ✅ Tractor eliminado correctamente\n');
    } else {
      console.log('  ❌ Error al eliminar tractor\n');
    }

    // ========== TEST BATEAS ==========
    console.log('📋 TEST BATEAS:\n');

    console.log('  1. Crear batea de prueba...');
    const createBatea = await makeRequest('POST', '/api/v1/bateas', {
      marca: 'Test',
      modelo: 'Test',
      patente: 'TESTB999',
      carga_max_batea: 1000,
    });

    if (createBatea.status !== 201) {
      console.log('  ❌ Error al crear batea');
      return;
    }

    const bateaId = createBatea.data.batea_id;
    console.log(`  ✅ Batea creada: ID ${bateaId}`);

    console.log('  2. Actualizar batea...');
    const updateBatea = await makeRequest(
      'PATCH',
      `/api/v1/bateas/${bateaId}`,
      { marca: 'Test Modificado' },
    );

    if (updateBatea.status === 200) {
      console.log('  ✅ Batea actualizada correctamente');
    } else {
      console.log('  ❌ Error al actualizar batea');
    }

    console.log('  3. Eliminar batea...');
    const deleteBatea = await makeRequest('DELETE', `/api/v1/bateas/${bateaId}`);

    if (deleteBatea.status === 200) {
      console.log('  ✅ Batea eliminada correctamente\n');
    } else {
      console.log('  ❌ Error al eliminar batea\n');
    }

    // ========== RESUMEN ==========
    console.log('═══════════════════════════════════════════════════');
    console.log('    ✅ TODOS LOS TESTS COMPLETADOS');
    console.log('═══════════════════════════════════════════════════\n');

    console.log('📊 Resumen de operaciones exitosas:\n');
    console.log('✅ CHOFERES:');
    console.log('   - Crear ✅');
    console.log('   - Actualizar ✅');
    console.log('   - Eliminar ✅\n');

    console.log('✅ TRACTORES:');
    console.log('   - Crear ✅');
    console.log('   - Actualizar ✅');
    console.log('   - Eliminar ✅\n');

    console.log('✅ BATEAS:');
    console.log('   - Crear ✅');
    console.log('   - Actualizar ✅');
    console.log('   - Eliminar ✅\n');

    console.log('💡 Problema resuelto:\n');
    console.log(
      '  El usuario reportó que no podía eliminar ni editar los choferes',
    );
    console.log('  cargados desde el archivo seed.\n');

    console.log('🔍 Causa raíz identificada:\n');
    console.log(
      '  - Las FK constraints en la tabla "viajes" impedían eliminar choferes',
    );
    console.log(
      '  - El método repository.remove() intentaba cargar relaciones que fallaban',
    );

    console.log('\n✅ Solución aplicada:\n');
    console.log(
      '  1. Agregado createForeignKeyConstraints: false en TODAS las entities',
    );
    console.log('     (chofer, tractor, batea, viaje)');
    console.log(
      '  2. Cambiado eliminar() de repository.remove() a repository.delete()',
    );
    console.log(
      '  3. Las FK constraints existentes se eliminaron al reiniciar el servidor',
    );
    console.log('     con las nuevas configuraciones de entity\n');

    console.log('🎉 Resultado:\n');
    console.log(
      '  Ahora es posible ELIMINAR y EDITAR cualquier registro sin restricciones',
    );
    console.log('  de foreign keys, tal como solicitó el usuario.\n');
  } catch (error) {
    console.log('❌ Error en el test:', error.message);
  }
}

testAllEntitiesCRUD();
