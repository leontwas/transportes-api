const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';

// Credenciales
const ADMIN_EMAIL = 'admin@transporte.com';
const ADMIN_PASSWORD = 'admin123';

let adminToken = '';
let choferToken = '';
let chofer1Id = null;
let chofer2Id = null;
let choferEmail = '';
let choferPassword = '';

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

async function prepararDatosPrueba() {
  console.log('👤 2. Preparando datos de prueba...\n');

  try {
    // Obtener choferes existentes para tener IDs
    const choferesRes = await axios.get(`${API_URL}/choferes`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (choferesRes.data.length < 2) {
      console.log('   ⚠️  Se necesitan al menos 2 choferes en la base de datos\n');
      process.exit(1);
    }

    chofer1Id = choferesRes.data[0].id_chofer;
    chofer2Id = choferesRes.data[1].id_chofer;

    console.log(`   ℹ️  Chofer 1: ${choferesRes.data[0].nombre_completo} (ID ${chofer1Id})`);
    console.log(`   ℹ️  Chofer 2: ${choferesRes.data[1].nombre_completo} (ID ${chofer2Id})\n`);

    // Usar credenciales de un chofer existente (debe existir en la BD)
    // NOTA: Para que este test funcione, debes tener al menos un usuario con rol 'chofer'
    // Puedes crearlo manualmente con:
    // 1. POST /api/v1/auth/register con nombre_completo, email, password
    // 2. Actualizar el usuario en la BD para asignarle rol='chofer' y chofer_id

    choferEmail = 'chofer.test@transporte.com';
    choferPassword = 'chofer123';

    console.log(`   💡 Se usará el usuario: ${choferEmail}`);
    console.log(`   ℹ️  Si no existe, créalo manualmente con rol='chofer' y chofer_id=${chofer1Id}\n`);

  } catch (error) {
    console.error('   ❌ Error preparando datos:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function loginChofer() {
  console.log('🔐 3. Login como Chofer...\n');
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: choferEmail,
      password: choferPassword,
    });
    choferToken = response.data.access_token;
    console.log('   ✅ Login chofer exitoso');
    console.log(`   📋 Chofer ID: ${response.data.user.chofer_id}\n`);
  } catch (error) {
    console.error('   ❌ Error en login chofer:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function testChoferAccesoPropio() {
  console.log('🧪 4. TEST: Chofer accede a sus propios datos...\n');

  try {
    const response = await axios.get(`${API_URL}/choferes/${chofer1Id}`, {
      headers: { Authorization: `Bearer ${choferToken}` }
    });

    if (response.status === 200 && response.data.id_chofer === chofer1Id) {
      console.log('   ✅ El chofer puede ver sus propios datos');
      console.log(`   📝 Datos obtenidos: ${response.data.nombre_completo}`);
      console.log(`   📝 Estado: ${response.data.estado_chofer}\n`);
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

async function testChoferAccesoOtro() {
  console.log('🧪 5. TEST: Chofer intenta acceder a datos de otro chofer...\n');

  try {
    await axios.get(`${API_URL}/choferes/${chofer2Id}`, {
      headers: { Authorization: `Bearer ${choferToken}` }
    });

    console.log('   ❌ ERROR: El chofer pudo acceder a datos de otro chofer\n');
    return false;

  } catch (error) {
    if (error.response?.status === 403) {
      console.log('   ✅ Acceso denegado correctamente (403)');
      console.log(`   📝 Mensaje: "${error.response.data.message}"\n`);
      return true;
    } else {
      console.error('   ❌ Error inesperado:', error.response?.data || error.message);
      return false;
    }
  }
}

async function testAdminAccesoCualquiera() {
  console.log('🧪 6. TEST: Admin accede a cualquier chofer...\n');

  try {
    const response1 = await axios.get(`${API_URL}/choferes/${chofer1Id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const response2 = await axios.get(`${API_URL}/choferes/${chofer2Id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response1.status === 200 && response2.status === 200) {
      console.log('   ✅ Admin puede ver chofer 1');
      console.log('   ✅ Admin puede ver chofer 2\n');
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

async function testChoferMeEndpoint() {
  console.log('🧪 7. TEST: Chofer usa /auth/me + /choferes/:id...\n');

  try {
    // 1. Obtener datos del usuario autenticado
    const meResponse = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${choferToken}` }
    });

    const choferIdFromMe = meResponse.data.chofer_id;
    console.log(`   ✅ /auth/me retorna chofer_id: ${choferIdFromMe}`);

    // 2. Usar ese ID para obtener los datos completos
    const choferResponse = await axios.get(`${API_URL}/choferes/${choferIdFromMe}`, {
      headers: { Authorization: `Bearer ${choferToken}` }
    });

    if (choferResponse.status === 200) {
      console.log('   ✅ /choferes/:id retorna datos completos');
      console.log(`   📝 Estado del chofer: ${choferResponse.data.estado_chofer}`);
      console.log(`   📝 Nombre: ${choferResponse.data.nombre_completo}\n`);
      return true;
    }

    return false;

  } catch (error) {
    console.error('   ❌ Error:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('  TEST: ACCESO DE CHOFERES A SUS PROPIOS DATOS');
  console.log('='.repeat(80));

  await loginAdmin();
  await prepararDatosPrueba();
  await loginChofer();

  const test1 = await testChoferAccesoPropio();
  const test2 = await testChoferAccesoOtro();
  const test3 = await testAdminAccesoCualquiera();
  const test4 = await testChoferMeEndpoint();

  console.log('='.repeat(80));
  console.log('  RESUMEN DE RESULTADOS');
  console.log('='.repeat(80));
  console.log(`\n  1. ${test1 ? '✅' : '❌'} Chofer puede acceder a sus propios datos`);
  console.log(`  2. ${test2 ? '✅' : '❌'} Chofer NO puede acceder a datos de otros`);
  console.log(`  3. ${test3 ? '✅' : '❌'} Admin puede acceder a cualquier chofer`);
  console.log(`  4. ${test4 ? '✅' : '❌'} Flujo /auth/me + /choferes/:id funciona\n`);

  if (test1 && test2 && test3 && test4) {
    console.log('  🎉 TODOS LOS TESTS PASARON EXITOSAMENTE\n');
    console.log('='.repeat(80) + '\n');
  } else {
    console.log('  ⚠️  ALGUNOS TESTS FALLARON\n');
    console.log('='.repeat(80) + '\n');
    process.exit(1);
  }
}

runTests();