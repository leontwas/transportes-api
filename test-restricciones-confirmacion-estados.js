const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';

// Credenciales
const ADMIN_EMAIL = 'admin@transporte.com';
const ADMIN_PASSWORD = 'admin123';

let adminToken = '';
let choferIdPrueba = null;

async function loginAdmin() {
  console.log('\n🔐 1. Login como Admin...\n');
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    adminToken = response.data.access_token;
    console.log('   ✅ Login admin exitoso\n');
  } catch (error) {
    console.error('   ❌ Error en login admin:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function obtenerChoferDisponible() {
  console.log('👤 2. Buscando chofer para pruebas...\n');

  try {
    const choferesRes = await axios.get(`${API_URL}/choferes`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Buscar un chofer con estado disponible (lowercase)
    const choferDisponible = choferesRes.data.find(c => c.estado_chofer === 'disponible');

    if (!choferDisponible) {
      console.log('   ⚠️  No hay choferes disponibles. Cambiando el primer chofer a disponible...\n');
      const primerChofer = choferesRes.data[0];

      // Cambiar a disponible primero
      try {
        await axios.patch(
          `${API_URL}/choferes/${primerChofer.id_chofer}/estado`,
          {
            estado_chofer: 'disponible',
            confirmado: true,
          },
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        choferIdPrueba = primerChofer.id_chofer;
        console.log(`   ✅ Chofer ${primerChofer.nombre_completo} (ID ${choferIdPrueba}) ahora está disponible\n`);
      } catch (error) {
        console.log('   ⚠️  No se pudo cambiar a disponible, usando el chofer tal como está');
        choferIdPrueba = primerChofer.id_chofer;
      }
    } else {
      choferIdPrueba = choferDisponible.id_chofer;
      console.log(`   ✅ Chofer encontrado: ${choferDisponible.nombre_completo} (ID ${choferIdPrueba})\n`);
    }

  } catch (error) {
    console.error('   ❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function testConfirmacionRequerida() {
  console.log('🧪 3. TEST: Confirmación requerida para cambiar de estado...\n');

  try {
    // Intentar cambiar de estado sin confirmado=true
    await axios.patch(
      `${API_URL}/choferes/${choferIdPrueba}/estado`,
      {
        estado_chofer: 'franco',
        fecha_inicio_licencia: new Date().toISOString(),
        razon_estado: 'Test sin confirmación',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    console.log('   ❌ ERROR: Se permitió cambiar sin confirmación\n');
    return false;

  } catch (error) {
    if (error.response?.status === 400 &&
        error.response?.data?.message?.includes('confirmación')) {
      console.log('   ✅ Correctamente bloqueado sin confirmación');
      console.log(`   📝 Mensaje: "${error.response.data.message}"\n`);
      return true;
    } else {
      console.error('   ❌ Error inesperado:', error.response?.data || error.message);
      return false;
    }
  }
}

async function testConfirmacionPermitecambio() {
  console.log('🧪 4. TEST: Con confirmación SÍ permite cambio válido...\n');

  try {
    // Cambiar a FRANCO con confirmación
    const response = await axios.patch(
      `${API_URL}/choferes/${choferIdPrueba}/estado`,
      {
        estado_chofer: 'franco',
        fecha_inicio_licencia: new Date().toISOString(),
        razon_estado: 'Test con confirmación',
        confirmado: true,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (response.status === 200) {
      console.log('   ✅ Cambio exitoso con confirmación');
      console.log(`   📝 Nuevo estado: ${response.data.chofer.estado_chofer}\n`);
      return true;
    } else {
      console.log('   ❌ Respuesta inesperada\n');
      return false;
    }

  } catch (error) {
    console.error('   ❌ Error:', error.response?.data || error.message);
    return false;
  }
}

async function prepararChoferViajando() {
  console.log('👤 5. Preparando chofer en estado VIAJANDO...\n');

  try {
    // Verificar estado actual
    const choferActualRes = await axios.get(`${API_URL}/choferes/${choferIdPrueba}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const estadoActual = choferActualRes.data.estado_chofer;

    // Si no está en disponible, cambiarlo
    if (estadoActual !== 'disponible') {
      await axios.patch(
        `${API_URL}/choferes/${choferIdPrueba}/estado`,
        {
          estado_chofer: 'disponible',
          confirmado: true,
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      console.log(`   ℹ️  Chofer cambiado de ${estadoActual} a disponible`);
    }

    // Crear un viaje para poder cambiar a CARGANDO
    const viajesRes = await axios.get(`${API_URL}/viajes`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Verificar si ya hay un viaje asignado
    const viajeExistente = viajesRes.data.find(v =>
      v.chofer_id === choferIdPrueba && v.estado_viaje !== 'FINALIZADO'
    );

    let viajeId;
    if (viajeExistente) {
      viajeId = viajeExistente.id_viaje;
      console.log(`   ℹ️  Usando viaje existente: ${viajeId}`);
    } else {
      // Obtener el tractor y batea asignados al chofer
      const choferDataRes = await axios.get(`${API_URL}/choferes/${choferIdPrueba}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      const tractorId = choferDataRes.data.tractor_id || choferDataRes.data.tractor?.tractor_id;
      const bateaId = choferDataRes.data.batea_id || choferDataRes.data.batea?.batea_id;

      if (!tractorId || !bateaId) {
        console.log('   ⚠️  Chofer no tiene tractor o batea asignados');
        return false;
      }

      const viajeNuevo = await axios.post(
        `${API_URL}/viajes`,
        {
          chofer_id: choferIdPrueba,
          tractor_id: tractorId,
          batea_id: bateaId,
          origen: 'Origen Test',
          destino: 'Destino Test',
          toneladas_cargadas: 50,
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      viajeId = viajeNuevo.data.id_viaje;
      console.log(`   ℹ️  Viaje creado: ${viajeId}`);
    }

    // Cambiar a CARGANDO
    await axios.patch(
      `${API_URL}/choferes/${choferIdPrueba}/estado`,
      {
        estado_chofer: 'cargando',
        confirmado: true,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    // Cambiar a VIAJANDO
    await axios.patch(
      `${API_URL}/choferes/${choferIdPrueba}/estado`,
      {
        estado_chofer: 'viajando',
        confirmado: true,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    console.log(`   ✅ Chofer ahora está en estado VIAJANDO\n`);
    return true;

  } catch (error) {
    console.error('   ❌ Error preparando estado VIAJANDO:', error.response?.data || error.message);
    return false;
  }
}

async function testRestriccionViajandoAFranco() {
  console.log('🧪 6. TEST: Desde VIAJANDO NO se puede ir a FRANCO...\n');

  try {
    await axios.patch(
      `${API_URL}/choferes/${choferIdPrueba}/estado`,
      {
        estado_chofer: 'franco',
        fecha_inicio_licencia: new Date().toISOString(),
        razon_estado: 'Intento de cambio desde VIAJANDO',
        confirmado: true,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    console.log('   ❌ ERROR: Se permitió cambiar de VIAJANDO a FRANCO\n');
    return false;

  } catch (error) {
    if (error.response?.status === 400 &&
        error.response?.data?.message?.includes('VIAJANDO')) {
      console.log('   ✅ Correctamente bloqueado VIAJANDO → FRANCO');
      console.log(`   📝 Mensaje: "${error.response.data.message}"\n`);
      return true;
    } else {
      console.error('   ❌ Error inesperado:', error.response?.data || error.message);
      return false;
    }
  }
}

async function testRestriccionViajandoALicencia() {
  console.log('🧪 7. TEST: Desde VIAJANDO NO se puede ir a LICENCIA_ANUAL...\n');

  try {
    await axios.patch(
      `${API_URL}/choferes/${choferIdPrueba}/estado`,
      {
        estado_chofer: 'licencia_anual',
        fecha_inicio_licencia: new Date().toISOString(),
        razon_estado: 'Intento de cambio desde VIAJANDO',
        confirmado: true,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    console.log('   ❌ ERROR: Se permitió cambiar de VIAJANDO a LICENCIA_ANUAL\n');
    return false;

  } catch (error) {
    if (error.response?.status === 400 &&
        error.response?.data?.message?.includes('VIAJANDO')) {
      console.log('   ✅ Correctamente bloqueado VIAJANDO → LICENCIA_ANUAL');
      console.log(`   📝 Mensaje: "${error.response.data.message}"\n`);
      return true;
    } else {
      console.error('   ❌ Error inesperado:', error.response?.data || error.message);
      return false;
    }
  }
}

async function testTransicionesPermitidas() {
  console.log('🧪 8. TEST: Transiciones permitidas desde VIAJANDO...\n');

  try {
    // VIAJANDO → DESCANSANDO debe funcionar
    const response = await axios.patch(
      `${API_URL}/choferes/${choferIdPrueba}/estado`,
      {
        estado_chofer: 'descansando',
        confirmado: true,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (response.status === 200) {
      console.log('   ✅ VIAJANDO → DESCANSANDO permitido correctamente');
      console.log(`   📝 Nuevo estado: ${response.data.chofer.estado_chofer}\n`);
      return true;
    } else {
      console.log('   ❌ Respuesta inesperada\n');
      return false;
    }

  } catch (error) {
    console.error('   ❌ Error:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('  TEST: RESTRICCIONES Y CONFIRMACIÓN DE ESTADOS');
  console.log('='.repeat(80));

  await loginAdmin();
  await obtenerChoferDisponible();

  const test1 = await testConfirmacionRequerida();
  const test2 = await testConfirmacionPermitecambio();

  const preparado = await prepararChoferViajando();
  let test3 = false;
  let test4 = false;
  let test5 = false;

  if (preparado) {
    test3 = await testRestriccionViajandoAFranco();
    test4 = await testRestriccionViajandoALicencia();
    test5 = await testTransicionesPermitidas();
  }

  console.log('='.repeat(80));
  console.log('  RESUMEN DE RESULTADOS');
  console.log('='.repeat(80));
  console.log(`\n  1. ${test1 ? '✅' : '❌'} Confirmación requerida para cambios de estado`);
  console.log(`  2. ${test2 ? '✅' : '❌'} Con confirmación permite cambios válidos`);
  console.log(`  3. ${test3 ? '✅' : '❌'} VIAJANDO → FRANCO bloqueado correctamente`);
  console.log(`  4. ${test4 ? '✅' : '❌'} VIAJANDO → LICENCIA_ANUAL bloqueado correctamente`);
  console.log(`  5. ${test5 ? '✅' : '❌'} VIAJANDO → DESCANSANDO permitido correctamente\n`);

  if (test1 && test2 && test3 && test4 && test5) {
    console.log('  🎉 TODOS LOS TESTS PASARON EXITOSAMENTE\n');
    console.log('='.repeat(80) + '\n');
  } else {
    console.log('  ⚠️  ALGUNOS TESTS FALLARON\n');
    console.log('='.repeat(80) + '\n');
    process.exit(1);
  }
}

runTests();