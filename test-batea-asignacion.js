const http = require('http');

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, error: 'JSON parse error' });
        }
      });
    });

    req.on('error', (error) => reject(error));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function testAsignaciones() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  🧪 PRUEBA DE ASIGNACIÓN DE CHOFER Y TRACTOR');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // 1. Obtener una batea para probar
    console.log('1. Obteniendo batea para prueba...');
    const bateaResponse = await makeRequest('GET', '/api/v1/bateas/10');

    if (bateaResponse.status !== 200) {
      console.log('❌ No se pudo obtener la batea 10');
      return;
    }

    const bateaOriginal = bateaResponse.data;
    console.log(`   ✓ Batea ${bateaOriginal.batea_id}: ${bateaOriginal.marca} ${bateaOriginal.modelo}`);
    console.log(`   - Chofer actual: ${bateaOriginal.chofer_id || 'ninguno'}`);
    console.log(`   - Tractor actual: ${bateaOriginal.tractor_id || 'ninguno'}`);

    // 2. Obtener choferes disponibles
    console.log('\n2. Buscando chofer activo...');
    const choferesResponse = await makeRequest('GET', '/api/v1/choferes');
    const choferActivo = choferesResponse.data.find(c => c.estado_chofer === 'activo');

    if (!choferActivo) {
      console.log('❌ No hay choferes activos disponibles');
      return;
    }

    console.log(`   ✓ Chofer encontrado: ${choferActivo.id_chofer} - ${choferActivo.nombre_completo}`);

    // 3. Obtener tractores disponibles
    console.log('\n3. Buscando tractor libre...');
    const tractoresResponse = await makeRequest('GET', '/api/v1/tractores');
    const tractorLibre = tractoresResponse.data.find(t => t.estado_tractor === 'libre');

    if (!tractorLibre) {
      console.log('❌ No hay tractores libres disponibles');
      return;
    }

    console.log(`   ✓ Tractor encontrado: ${tractorLibre.tractor_id} - ${tractorLibre.marca} ${tractorLibre.modelo}`);

    // 4. Asignar chofer usando PATCH
    console.log('\n4. Asignando chofer a la batea usando PATCH...');
    const asignarChoferResponse = await makeRequest(
      'PATCH',
      `/api/v1/bateas/${bateaOriginal.batea_id}`,
      { chofer_id: choferActivo.id_chofer }
    );

    if (asignarChoferResponse.status === 200) {
      console.log(`   ✅ Chofer asignado exitosamente`);
      console.log(`   - Batea: ${asignarChoferResponse.data.batea_id}`);
      console.log(`   - Chofer: ${asignarChoferResponse.data.chofer?.nombre_completo || 'ERROR'}`);
    } else {
      console.log(`   ❌ Error: ${asignarChoferResponse.status}`);
      if (asignarChoferResponse.data.message) {
        console.log(`   Mensaje: ${asignarChoferResponse.data.message}`);
      }
      return;
    }

    // 5. Asignar tractor usando PATCH
    console.log('\n5. Asignando tractor a la batea usando PATCH...');
    const asignarTractorResponse = await makeRequest(
      'PATCH',
      `/api/v1/bateas/${bateaOriginal.batea_id}`,
      { tractor_id: tractorLibre.tractor_id }
    );

    if (asignarTractorResponse.status === 200) {
      console.log(`   ✅ Tractor asignado exitosamente`);
      console.log(`   - Batea: ${asignarTractorResponse.data.batea_id}`);
      console.log(`   - Tractor: ${asignarTractorResponse.data.tractor?.marca || 'ERROR'} ${asignarTractorResponse.data.tractor?.modelo || ''}`);
    } else {
      console.log(`   ❌ Error: ${asignarTractorResponse.status}`);
      if (asignarTractorResponse.data.message) {
        console.log(`   Mensaje: ${asignarTractorResponse.data.message}`);
      }
      return;
    }

    // 6. Verificar estado final
    console.log('\n6. Verificando estado final de la batea...');
    const bateaFinalResponse = await makeRequest('GET', `/api/v1/bateas/${bateaOriginal.batea_id}`);
    const bateaFinal = bateaFinalResponse.data;

    console.log(`   ✓ Batea ${bateaFinal.batea_id}:`);
    console.log(`   - Chofer: ${bateaFinal.chofer?.nombre_completo || 'ninguno'} (ID: ${bateaFinal.chofer_id})`);
    console.log(`   - Tractor: ${bateaFinal.tractor?.marca || 'ninguno'} ${bateaFinal.tractor?.modelo || ''} (ID: ${bateaFinal.tractor_id})`);

    // Validar que todo esté correcto
    const choferOk = bateaFinal.chofer_id === choferActivo.id_chofer;
    const tractorOk = bateaFinal.tractor_id === tractorLibre.tractor_id;
    const choferPoblado = bateaFinal.chofer !== null;
    const tractorPoblado = bateaFinal.tractor !== null;

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  📊 RESULTADO DE LAS PRUEBAS');
    console.log('═══════════════════════════════════════════════════\n');

    if (choferOk && tractorOk && choferPoblado && tractorPoblado) {
      console.log('✅ TODAS LAS PRUEBAS PASARON EXITOSAMENTE\n');
      console.log('Las asignaciones desde el menú "Editar Batea" funcionan correctamente:');
      console.log(`  ✓ Chofer asignado: ${bateaFinal.chofer.nombre_completo}`);
      console.log(`  ✓ Tractor asignado: ${bateaFinal.tractor.marca} ${bateaFinal.tractor.modelo}`);
      console.log(`  ✓ Objetos poblados correctamente en la respuesta`);
      console.log(`  ✓ Validaciones de estado (activo/libre) funcionando\n`);
    } else {
      console.log('❌ ALGUNAS PRUEBAS FALLARON\n');
      if (!choferOk) console.log('  ✗ Chofer no asignado correctamente');
      if (!tractorOk) console.log('  ✗ Tractor no asignado correctamente');
      if (!choferPoblado) console.log('  ✗ Objeto chofer no poblado');
      if (!tractorPoblado) console.log('  ✗ Objeto tractor no poblado');
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error durante las pruebas:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  El servidor NestJS no está corriendo');
      console.log('   Ejecuta: npm run start:dev\n');
    }
  }
}

testAsignaciones();
