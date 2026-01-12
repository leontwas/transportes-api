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
  console.log('👤 2. Obteniendo chofer disponible...\n');

  try {
    const choferesRes = await axios.get(`${API_URL}/choferes`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Buscar un chofer disponible
    let choferDisponible = choferesRes.data.find(c => c.estado_chofer === 'disponible');

    // Si no hay disponible, cambiar el primero a disponible
    if (!choferDisponible) {
      const primerChofer = choferesRes.data[0];
      await axios.patch(
        `${API_URL}/choferes/${primerChofer.id_chofer}/estado`,
        {
          estado_chofer: 'disponible',
          confirmado: true,
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      choferIdPrueba = primerChofer.id_chofer;
      console.log(`   ✅ Chofer ${primerChofer.nombre_completo} (ID ${choferIdPrueba}) cambiado a disponible\n`);
    } else {
      choferIdPrueba = choferDisponible.id_chofer;
      console.log(`   ✅ Chofer encontrado: ${choferDisponible.nombre_completo} (ID ${choferIdPrueba})\n`);
    }

  } catch (error) {
    console.error('   ❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function cambiarAFrancoVencido() {
  console.log('🧪 3. TEST: Cambiar chofer a FRANCO con fecha vencida...\n');

  try {
    // Primero verificar el estado actual
    const choferRes = await axios.get(`${API_URL}/choferes/${choferIdPrueba}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const estadoActual = choferRes.data.estado_chofer;
    console.log(`   📋 Estado actual del chofer: ${estadoActual}`);

    // Si ya está en franco, primero cambiar a otro estado
    if (estadoActual === 'franco') {
      console.log('   ⚙️  Chofer ya está en FRANCO, cambiando primero a LICENCIA_ANUAL...');
      await axios.patch(
        `${API_URL}/choferes/${choferIdPrueba}/estado`,
        {
          estado_chofer: 'licencia_anual',
          fecha_inicio_licencia: new Date().toISOString(),
          fecha_fin_licencia: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          razon_estado: 'Estado temporal',
          confirmado: true,
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      console.log('   ✅ Cambio temporal completado\n');
    }

    // Establecer fecha de fin en el pasado (ayer)
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - 2); // Hace 2 días

    const fechaFin = new Date();
    fechaFin.setDate(fechaFin.getDate() - 1); // Ayer

    const response = await axios.patch(
      `${API_URL}/choferes/${choferIdPrueba}/estado`,
      {
        estado_chofer: 'franco',
        fecha_inicio_licencia: fechaInicio.toISOString(),
        fecha_fin_licencia: fechaFin.toISOString(),
        razon_estado: 'Franco de prueba vencido',
        confirmado: true,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (response.status === 200) {
      console.log('   ✅ Chofer cambiado a FRANCO');
      console.log(`   📝 Fecha inicio: ${fechaInicio.toISOString()}`);
      console.log(`   📝 Fecha fin: ${fechaFin.toISOString()} (VENCIDA)\n`);
      return true;
    }

    return false;

  } catch (error) {
    console.error('   ❌ Error:', error.response?.data || error.message);
    return false;
  }
}

async function verificarEstadoActual() {
  console.log('🔍 4. Verificar estado actual antes del scheduler...\n');

  try {
    const response = await axios.get(`${API_URL}/choferes/${choferIdPrueba}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    console.log(`   📋 Estado actual: ${response.data.estado_chofer}`);
    console.log(`   📋 Razón: ${response.data.razon_estado || 'N/A'}`);
    console.log(`   📋 Fecha fin: ${response.data.fecha_fin_licencia || 'N/A'}\n`);

    return response.data.estado_chofer;

  } catch (error) {
    console.error('   ❌ Error:', error.response?.data || error.message);
    return null;
  }
}

async function ejecutarSchedulerManual() {
  console.log('⚙️  5. Ejecutando scheduler manualmente...\n');

  try {
    const response = await axios.post(
      `${API_URL}/choferes/verificar-estados-vencidos`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    console.log('   ✅ Scheduler ejecutado');
    console.log(`   📝 Timestamp: ${response.data.timestamp}\n`);
    return true;

  } catch (error) {
    console.error('   ❌ Error:', error.response?.data || error.message);
    return false;
  }
}

async function verificarEstadoDespues() {
  console.log('🔍 6. Verificar estado después del scheduler...\n');

  try {
    const response = await axios.get(`${API_URL}/choferes/${choferIdPrueba}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    console.log(`   📋 Estado actual: ${response.data.estado_chofer}`);
    console.log(`   📋 Razón: ${response.data.razon_estado || 'N/A'}`);
    console.log(`   📋 Fecha fin: ${response.data.fecha_fin_licencia || 'N/A'}\n`);

    return response.data.estado_chofer;

  } catch (error) {
    console.error('   ❌ Error:', error.response?.data || error.message);
    return null;
  }
}

async function testLicenciaVencida() {
  console.log('🧪 7. TEST: Cambiar chofer a LICENCIA_ANUAL con fecha vencida...\n');

  try {
    // Verificar estado actual
    const choferRes = await axios.get(`${API_URL}/choferes/${choferIdPrueba}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const estadoActual = choferRes.data.estado_chofer;
    console.log(`   📋 Estado actual del chofer: ${estadoActual}`);

    // Si ya está en licencia_anual, cambiar primero a franco
    if (estadoActual === 'licencia_anual') {
      console.log('   ⚙️  Chofer ya está en LICENCIA_ANUAL, cambiando primero a FRANCO...');
      await axios.patch(
        `${API_URL}/choferes/${choferIdPrueba}/estado`,
        {
          estado_chofer: 'franco',
          fecha_inicio_licencia: new Date().toISOString(),
          fecha_fin_licencia: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          razon_estado: 'Estado temporal',
          confirmado: true,
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      console.log('   ✅ Cambio temporal completado\n');
    }

    // Establecer fecha de fin en el pasado
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - 5); // Hace 5 días

    const fechaFin = new Date();
    fechaFin.setHours(fechaFin.getHours() - 1); // Hace 1 hora

    const response = await axios.patch(
      `${API_URL}/choferes/${choferIdPrueba}/estado`,
      {
        estado_chofer: 'licencia_anual',
        fecha_inicio_licencia: fechaInicio.toISOString(),
        fecha_fin_licencia: fechaFin.toISOString(),
        razon_estado: 'Licencia de prueba vencida',
        confirmado: true,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (response.status === 200) {
      console.log('   ✅ Chofer cambiado a LICENCIA_ANUAL');
      console.log(`   📝 Fecha fin: ${fechaFin.toISOString()} (VENCIDA)\n`);
      return true;
    }

    return false;

  } catch (error) {
    console.error('   ❌ Error:', error.response?.data || error.message);
    return false;
  }
}

async function testFrancoNoVencido() {
  console.log('🧪 8. TEST: Cambiar chofer a FRANCO con fecha NO vencida...\n');

  try {
    // Verificar estado actual
    const choferRes = await axios.get(`${API_URL}/choferes/${choferIdPrueba}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const estadoActual = choferRes.data.estado_chofer;
    console.log(`   📋 Estado actual del chofer: ${estadoActual}`);

    // Si ya está en franco, cambiar primero a licencia_anual
    if (estadoActual === 'franco') {
      console.log('   ⚙️  Chofer ya está en FRANCO, cambiando primero a LICENCIA_ANUAL...');
      await axios.patch(
        `${API_URL}/choferes/${choferIdPrueba}/estado`,
        {
          estado_chofer: 'licencia_anual',
          fecha_inicio_licencia: new Date().toISOString(),
          fecha_fin_licencia: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          razon_estado: 'Estado temporal',
          confirmado: true,
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      console.log('   ✅ Cambio temporal completado\n');
    }

    // Establecer fecha de fin en el futuro
    const fechaInicio = new Date();

    const fechaFin = new Date();
    fechaFin.setDate(fechaFin.getDate() + 7); // En 7 días

    const response = await axios.patch(
      `${API_URL}/choferes/${choferIdPrueba}/estado`,
      {
        estado_chofer: 'franco',
        fecha_inicio_licencia: fechaInicio.toISOString(),
        fecha_fin_licencia: fechaFin.toISOString(),
        razon_estado: 'Franco activo (no vencido)',
        confirmado: true,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (response.status === 200) {
      console.log('   ✅ Chofer cambiado a FRANCO');
      console.log(`   📝 Fecha fin: ${fechaFin.toISOString()} (NO VENCIDA)\n`);

      // Ejecutar scheduler
      await axios.post(
        `${API_URL}/choferes/verificar-estados-vencidos`,
        {},
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      // Verificar que NO cambió
      const verificacion = await axios.get(`${API_URL}/choferes/${choferIdPrueba}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      if (verificacion.data.estado_chofer === 'franco') {
        console.log('   ✅ Estado NO cambió (correcto, fecha no vencida)\n');
        return true;
      } else {
        console.log('   ❌ ERROR: Estado cambió cuando no debería\n');
        return false;
      }
    }

    return false;

  } catch (error) {
    console.error('   ❌ Error:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('  TEST: CAMBIO AUTOMÁTICO DE ESTADOS VENCIDOS');
  console.log('='.repeat(80));

  await loginAdmin();
  await obtenerChoferDisponible();

  // Test 1: Franco vencido
  const test1 = await cambiarAFrancoVencido();
  const estadoAntes1 = test1 ? await verificarEstadoActual() : null;
  const test2 = test1 ? await ejecutarSchedulerManual() : false;
  const estadoDespues1 = test2 ? await verificarEstadoDespues() : null;

  const francoFunciona = estadoAntes1 === 'franco' && estadoDespues1 === 'disponible';

  // Test 2: Licencia vencida
  const test3 = await testLicenciaVencida();
  const estadoAntes2 = test3 ? await verificarEstadoActual() : null;
  const test4 = test3 ? await ejecutarSchedulerManual() : false;
  const estadoDespues2 = test4 ? await verificarEstadoDespues() : null;

  const licenciaFunciona = estadoAntes2 === 'licencia_anual' && estadoDespues2 === 'disponible';

  // Test 3: Franco NO vencido
  const test5 = await testFrancoNoVencido();

  console.log('='.repeat(80));
  console.log('  RESUMEN DE RESULTADOS');
  console.log('='.repeat(80));
  console.log(`\n  1. ${francoFunciona ? '✅' : '❌'} FRANCO vencido → DISPONIBLE automáticamente`);
  console.log(`  2. ${licenciaFunciona ? '✅' : '❌'} LICENCIA_ANUAL vencida → DISPONIBLE automáticamente`);
  console.log(`  3. ${test5 ? '✅' : '❌'} FRANCO NO vencido permanece sin cambios\n`);

  if (francoFunciona && licenciaFunciona && test5) {
    console.log('  🎉 TODOS LOS TESTS PASARON EXITOSAMENTE\n');
    console.log('  ℹ️  El scheduler se ejecuta automáticamente cada hora');
    console.log('  ℹ️  También puedes ejecutarlo manualmente: POST /choferes/verificar-estados-vencidos');
    console.log('='.repeat(80) + '\n');
  } else {
    console.log('  ⚠️  ALGUNOS TESTS FALLARON\n');
    console.log('='.repeat(80) + '\n');
    process.exit(1);
  }
}

runTests();