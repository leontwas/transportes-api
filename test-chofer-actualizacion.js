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

async function testChoferUpdate() {
  console.log('═══════════════════════════════════════════════════');
  console.log('    🧪 TEST: ACTUALIZACIÓN DE CHOFER');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Paso 1: Obtener el primer chofer
    console.log('📋 Paso 1: Obtener chofer...');
    const getChofer = await makeRequest('GET', '/api/v1/choferes/1');

    if (getChofer.status !== 200) {
      console.log('❌ Error al obtener chofer:', getChofer.status);
      return;
    }

    console.log(`✅ Chofer obtenido: ${getChofer.data.nombre_completo}`);
    console.log(`   Estado: ${getChofer.data.estado_chofer}`);
    console.log(`   Batea actual: ${getChofer.data.batea_id || 'ninguna'}`);
    console.log(`   Tractor actual: ${getChofer.data.tractor_id || 'ninguno'}\n`);

    // Paso 2: Obtener bateas y tractores disponibles
    console.log('📋 Paso 2: Buscar batea disponible (estado: vacio)...');
    const getBateas = await makeRequest('GET', '/api/v1/bateas');
    const bateaDisponible = getBateas.data.find(b => b.estado === 'vacio' && !b.chofer_id);

    if (!bateaDisponible) {
      console.log('⚠️  No hay bateas disponibles');
      return;
    }
    console.log(`✅ Batea disponible encontrada: ID ${bateaDisponible.batea_id} (${bateaDisponible.patente})\n`);

    console.log('📋 Paso 3: Buscar tractor disponible (estado: libre)...');
    const getTractores = await makeRequest('GET', '/api/v1/tractores');
    const tractorDisponible = getTractores.data.find(t => t.estado_tractor === 'libre' && !t.chofer_id);

    if (!tractorDisponible) {
      console.log('⚠️  No hay tractores disponibles');
      return;
    }
    console.log(`✅ Tractor disponible encontrado: ID ${tractorDisponible.tractor_id} (${tractorDisponible.patente})\n`);

    // Paso 4: Actualizar chofer con batea y tractor
    console.log('📋 Paso 4: Actualizar chofer asignando batea y tractor...');
    const updateData = {
      nombre_completo: getChofer.data.nombre_completo,
      estado_chofer: 'activo',
      batea_id: bateaDisponible.batea_id,
      tractor_id: tractorDisponible.tractor_id,
    };

    const updateChofer = await makeRequest('PATCH', `/api/v1/choferes/${getChofer.data.id_chofer}`, updateData);

    if (updateChofer.status !== 200) {
      console.log('❌ Error al actualizar chofer:', updateChofer.status);
      console.log('   Respuesta:', JSON.stringify(updateChofer.data, null, 2));
      return;
    }

    console.log('✅ Chofer actualizado correctamente!');
    console.log(`   Nombre: ${updateChofer.data.nombre_completo}`);
    console.log(`   Estado: ${updateChofer.data.estado_chofer}`);
    console.log(`   Batea asignada: ${updateChofer.data.batea_id} (${updateChofer.data.batea?.patente || 'N/A'})`);
    console.log(`   Tractor asignado: ${updateChofer.data.tractor_id} (${updateChofer.data.tractor?.patente || 'N/A'})\n`);

    // Paso 5: Verificar que la batea también tenga el chofer asignado
    console.log('📋 Paso 5: Verificar relación bidireccional en batea...');
    const checkBatea = await makeRequest('GET', `/api/v1/bateas/${bateaDisponible.batea_id}`);

    if (checkBatea.data.chofer_id === getChofer.data.id_chofer) {
      console.log(`✅ Batea ${bateaDisponible.batea_id} tiene asignado el chofer ${getChofer.data.id_chofer}`);
      console.log(`   Chofer en batea: ${checkBatea.data.chofer?.nombre_completo || 'N/A'}\n`);
    } else {
      console.log(`❌ La batea ${bateaDisponible.batea_id} NO tiene el chofer asignado correctamente`);
      console.log(`   Esperado: ${getChofer.data.id_chofer}, Obtenido: ${checkBatea.data.chofer_id}\n`);
    }

    // Paso 6: Verificar que el tractor también tenga el chofer asignado
    console.log('📋 Paso 6: Verificar relación bidireccional en tractor...');
    const checkTractor = await makeRequest('GET', `/api/v1/tractores/${tractorDisponible.tractor_id}`);

    if (checkTractor.data.chofer_id === getChofer.data.id_chofer) {
      console.log(`✅ Tractor ${tractorDisponible.tractor_id} tiene asignado el chofer ${getChofer.data.id_chofer}`);
      console.log(`   Chofer en tractor: ${checkTractor.data.chofer?.nombre_completo || 'N/A'}\n`);
    } else {
      console.log(`❌ El tractor ${tractorDisponible.tractor_id} NO tiene el chofer asignado correctamente`);
      console.log(`   Esperado: ${getChofer.data.id_chofer}, Obtenido: ${checkTractor.data.chofer_id}\n`);
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('    ✅ TEST COMPLETADO EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════\n');

    console.log('💡 Ahora puedes editar choferes desde la interfaz "Editar Chofer"');
    console.log('   y asignar bateas/tractores sin errores.\n');

  } catch (error) {
    console.log('❌ Error en el test:', error.message);
  }
}

testChoferUpdate();
