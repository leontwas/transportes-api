const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';

// Credenciales
const ADMIN_EMAIL = 'admin@transporte.com';
const ADMIN_PASSWORD = 'admin123';
const CHOFER_EMAIL = 'chofer.test@transporte.com';
const CHOFER_PASSWORD = 'chofer123';

let adminToken = '';
let choferToken = '';
let choferId = null;
let viajeId = null;

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

async function loginChofer() {
  console.log('🔐 2. Login como Chofer...\n');
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: CHOFER_EMAIL,
      password: CHOFER_PASSWORD,
    });
    choferToken = response.data.access_token;
    choferId = response.data.user.chofer_id;
    console.log('   ✅ Login chofer exitoso');
    console.log(`   📋 Chofer ID: ${choferId}\n`);
  } catch (error) {
    console.error('   ❌ Error en login chofer:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function testSinViajeActivo() {
  console.log('🧪 3. TEST: Chofer sin viaje activo...\n');

  try {
    const response = await axios.get(`${API_URL}/choferes/mi-viaje-activo`, {
      headers: { Authorization: `Bearer ${choferToken}` }
    });

    if (response.status === 200 && response.data === null) {
      console.log('   ✅ Correctamente devuelve null cuando no hay viaje activo\n');
      return true;
    } else {
      console.log('   ❌ Respuesta inesperada:', response.data);
      return false;
    }

  } catch (error) {
    console.error('   ❌ Error:', error.response?.data || error.message);
    return false;
  }
}

async function crearViajeParaChofer() {
  console.log('👤 4. Creando viaje para el chofer...\n');

  try {
    // Obtener datos del chofer con tractor y batea
    const choferRes = await axios.get(`${API_URL}/choferes/${choferId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const tractorId = choferRes.data.tractor_id;
    const bateaId = choferRes.data.batea_id;

    if (!tractorId || !bateaId) {
      console.log('   ⚠️  Chofer no tiene tractor o batea asignados');
      return false;
    }

    // Crear viaje
    const viajeRes = await axios.post(
      `${API_URL}/viajes`,
      {
        chofer_id: choferId,
        tractor_id: tractorId,
        batea_id: bateaId,
        origen: 'Origen Test',
        destino: 'Buenos Aires',
        toneladas_cargadas: 30,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    viajeId = viajeRes.data.id_viaje;
    console.log(`   ✅ Viaje creado: ID ${viajeId}`);
    console.log(`   📝 Destino: ${viajeRes.data.destino}\n`);
    return true;

  } catch (error) {
    console.error('   ❌ Error creando viaje:', error.response?.data || error.message);
    return false;
  }
}

async function testConViajeActivo() {
  console.log('🧪 5. TEST: Chofer con viaje activo...\n');

  try {
    const response = await axios.get(`${API_URL}/choferes/mi-viaje-activo`, {
      headers: { Authorization: `Bearer ${choferToken}` }
    });

    if (response.status === 200 && response.data !== null) {
      console.log('   ✅ Correctamente devuelve el viaje activo');
      console.log(`   📝 ID Viaje: ${response.data.id_viaje}`);
      console.log(`   📝 Destino: ${response.data.destino}`);
      console.log(`   📝 Estado: ${response.data.estado_viaje}`);

      // Verificar que incluye tractor y batea
      if (response.data.tractor && response.data.batea) {
        console.log(`   📝 Tractor: ${response.data.tractor.patente}`);
        console.log(`   📝 Batea: ${response.data.batea.patente}\n`);
        return true;
      } else {
        console.log('   ⚠️  Falta información de tractor o batea\n');
        return false;
      }
    } else {
      console.log('   ❌ Respuesta inesperada:', response.data);
      return false;
    }

  } catch (error) {
    console.error('   ❌ Error:', error.response?.data || error.message);
    return false;
  }
}

async function finalizarViaje() {
  console.log('👤 6. Finalizando viaje...\n');

  try {
    await axios.patch(
      `${API_URL}/viajes/${viajeId}`,
      {
        estado_viaje: 'finalizado',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    console.log('   ✅ Viaje finalizado\n');
    return true;

  } catch (error) {
    console.error('   ❌ Error finalizando viaje:', error.response?.data || error.message);
    return false;
  }
}

async function testConViajeFinalizado() {
  console.log('🧪 7. TEST: Chofer con viaje finalizado (no debe aparecer)...\n');

  try {
    const response = await axios.get(`${API_URL}/choferes/mi-viaje-activo`, {
      headers: { Authorization: `Bearer ${choferToken}` }
    });

    if (response.status === 200 && response.data === null) {
      console.log('   ✅ Correctamente devuelve null cuando el viaje está finalizado\n');
      return true;
    } else {
      console.log('   ❌ ERROR: Devuelve viaje finalizado cuando no debería');
      console.log('   📝 Datos:', response.data);
      return false;
    }

  } catch (error) {
    console.error('   ❌ Error:', error.response?.data || error.message);
    return false;
  }
}

async function testAccesoNoAutenticado() {
  console.log('🧪 8. TEST: Acceso sin autenticación...\n');

  try {
    await axios.get(`${API_URL}/choferes/mi-viaje-activo`);

    console.log('   ❌ ERROR: Permitió acceso sin autenticación\n');
    return false;

  } catch (error) {
    if (error.response?.status === 401) {
      console.log('   ✅ Correctamente bloqueado sin autenticación (401)\n');
      return true;
    } else {
      console.error('   ❌ Error inesperado:', error.response?.data || error.message);
      return false;
    }
  }
}

async function testAccesoAdmin() {
  console.log('🧪 9. TEST: Acceso como admin (debe ser bloqueado)...\n');

  try {
    await axios.get(`${API_URL}/choferes/mi-viaje-activo`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    console.log('   ❌ ERROR: Permitió acceso como admin\n');
    return false;

  } catch (error) {
    if (error.response?.status === 403) {
      console.log('   ✅ Correctamente bloqueado para rol admin (403)\n');
      return true;
    } else {
      console.error('   ❌ Error inesperado:', error.response?.data || error.message);
      return false;
    }
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('  TEST: ENDPOINT /api/v1/choferes/mi-viaje-activo');
  console.log('='.repeat(80));

  await loginAdmin();
  await loginChofer();

  const test1 = await testSinViajeActivo();
  const test2 = await crearViajeParaChofer();
  const test3 = test2 ? await testConViajeActivo() : false;
  const test4 = test2 ? await finalizarViaje() : false;
  const test5 = test4 ? await testConViajeFinalizado() : false;
  const test6 = await testAccesoNoAutenticado();
  const test7 = await testAccesoAdmin();

  console.log('='.repeat(80));
  console.log('  RESUMEN DE RESULTADOS');
  console.log('='.repeat(80));
  console.log(`\n  1. ${test1 ? '✅' : '❌'} Sin viaje activo devuelve null`);
  console.log(`  2. ${test2 ? '✅' : '❌'} Viaje creado correctamente`);
  console.log(`  3. ${test3 ? '✅' : '❌'} Con viaje activo devuelve datos completos`);
  console.log(`  4. ${test4 ? '✅' : '❌'} Viaje finalizado correctamente`);
  console.log(`  5. ${test5 ? '✅' : '❌'} Viaje finalizado no aparece como activo`);
  console.log(`  6. ${test6 ? '✅' : '❌'} Bloqueado sin autenticación`);
  console.log(`  7. ${test7 ? '✅' : '❌'} Bloqueado para rol admin\n`);

  if (test1 && test2 && test3 && test4 && test5 && test6 && test7) {
    console.log('  🎉 TODOS LOS TESTS PASARON EXITOSAMENTE\n');
    console.log('='.repeat(80) + '\n');
  } else {
    console.log('  ⚠️  ALGUNOS TESTS FALLARON\n');
    console.log('='.repeat(80) + '\n');
    process.exit(1);
  }
}

runTests();