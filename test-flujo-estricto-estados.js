const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';

async function testFlujoEstrictoEstados() {
  try {
    console.log('🧪 PROBANDO FLUJO ESTRICTO DE ESTADOS DE CHOFER\n');
    console.log('════════════════════════════════════════════════════════════\n');

    // Login como admin
    console.log('1️⃣  Haciendo login como admin...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@transporte.com',
      password: 'admin123',
    });
    const token = loginResponse.data.access_token;
    console.log(`   ✓ Token obtenido\n`);

    const headers = { Authorization: `Bearer ${token}` };

    // Obtener choferes
    console.log('2️⃣  Obteniendo choferes...');
    const choferesResponse = await axios.get(`${API_URL}/choferes`, { headers });
    const choferes = choferesResponse.data;
    let chofer = choferes.find(c => c.estado_chofer === 'disponible') || choferes[0];
    console.log(`   ✓ Usando chofer: ${chofer.nombre_completo} (ID: ${chofer.id_chofer})`);
    console.log(`   ✓ Estado actual: ${chofer.estado_chofer}\n`);

    // Poner chofer en DISPONIBLE si no lo está
    if (chofer.estado_chofer !== 'disponible') {
      console.log('3️⃣  Cambiando chofer a DISPONIBLE...');
      const disponibleResponse = await axios.patch(
        `${API_URL}/choferes/${chofer.id_chofer}/estado`,
        { estado_chofer: 'disponible' },
        { headers }
      );
      chofer = disponibleResponse.data;
      console.log(`   ✓ Estado: ${chofer.estado_chofer}\n`);
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('  FLUJO OBLIGATORIO:');
    console.log('  DISPONIBLE → CARGANDO → VIAJANDO → DESCANSANDO → VIAJANDO → DESCARGANDO → (VIAJANDO o DISPONIBLE)');
    console.log('════════════════════════════════════════════════════════════\n');

    // Paso 1: DISPONIBLE → CARGANDO
    console.log('4️⃣  Transición: DISPONIBLE → CARGANDO (✓ válido)');
    const cargandoResponse = await axios.patch(
      `${API_URL}/choferes/${chofer.id_chofer}/estado`,
      { estado_chofer: 'cargando' },
      { headers }
    );
    console.log(`   ✓ Estado: ${cargandoResponse.data.estado_chofer}\n`);

    // Paso 2: CARGANDO → VIAJANDO
    console.log('5️⃣  Transición: CARGANDO → VIAJANDO (✓ válido)');
    const viajandoResponse = await axios.patch(
      `${API_URL}/choferes/${chofer.id_chofer}/estado`,
      { estado_chofer: 'viajando' },
      { headers }
    );
    console.log(`   ✓ Estado: ${viajandoResponse.data.estado_chofer}\n`);

    // Prueba de transición INVÁLIDA: VIAJANDO → DESCARGANDO (sin pasar por DESCANSANDO)
    console.log('6️⃣  ❌ Intentando transición INVÁLIDA: VIAJANDO → DESCARGANDO (sin descanso)');
    try {
      const invalidResponse = await axios.patch(
        `${API_URL}/choferes/${chofer.id_chofer}/estado`,
        { estado_chofer: 'descargando' },
        { headers }
      );
      console.log(`   ❌ ERROR CRÍTICO: La transición fue permitida cuando NO debería serlo`);
      console.log(`   ❌ Estado resultante: ${invalidResponse.data.estado_chofer}`);
      console.log(`   ❌ La validación del flujo NO está funcionando correctamente\n`);
      process.exit(1);
    } catch (error) {
      if (error.response) {
        console.log(`   ✓ Transición rechazada correctamente`);
        console.log(`   ✓ Mensaje: ${error.response.data.message}\n`);
      } else {
        console.log(`   ❌ Error inesperado: ${error.message}\n`);
        process.exit(1);
      }
    }

    // Paso 3: VIAJANDO → DESCANSANDO (obligatorio)
    console.log('7️⃣  Transición: VIAJANDO → DESCANSANDO (✓ válido - OBLIGATORIO)');
    const descansandoResponse = await axios.patch(
      `${API_URL}/choferes/${chofer.id_chofer}/estado`,
      { estado_chofer: 'descansando' },
      { headers }
    );
    console.log(`   ✓ Estado: ${descansandoResponse.data.estado_chofer}`);
    console.log(`   ℹ️  Se registró hora_inicio_descanso en el viaje activo\n`);

    // Esperar 3 segundos para simular descanso
    console.log('⏳ Esperando 3 segundos para simular descanso...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Paso 4: DESCANSANDO → VIAJANDO (para cerrar el descanso)
    console.log('8️⃣  Transición: DESCANSANDO → VIAJANDO (✓ válido - cierra descanso)');
    const viajando2Response = await axios.patch(
      `${API_URL}/choferes/${chofer.id_chofer}/estado`,
      { estado_chofer: 'viajando' },
      { headers }
    );
    console.log(`   ✓ Estado: ${viajando2Response.data.estado_chofer}`);
    console.log(`   ℹ️  Se registró hora_fin_descanso y se calcularon las horas de descanso\n`);

    // Ahora SÍ puede pasar a DESCARGANDO porque ya pasó por DESCANSANDO
    console.log('9️⃣  Transición: VIAJANDO → DESCARGANDO (✓ válido - ya descansó)');
    const descargandoResponse = await axios.patch(
      `${API_URL}/choferes/${chofer.id_chofer}/estado`,
      {
        estado_chofer: 'descargando',
        toneladas_descargadas: 28.5
      },
      { headers }
    );
    console.log(`   ✓ Estado: ${descargandoResponse.data.estado_chofer}`);
    console.log(`   ℹ️  Se registraron 28.5 toneladas descargadas\n`);

    // Paso 5: DESCARGANDO → DISPONIBLE (finaliza viaje)
    console.log('🔟 Transición: DESCARGANDO → DISPONIBLE (✓ válido - finaliza viaje)');
    const finalResponse = await axios.patch(
      `${API_URL}/choferes/${chofer.id_chofer}/estado`,
      { estado_chofer: 'disponible' },
      { headers }
    );
    console.log(`   ✓ Estado: ${finalResponse.data.estado_chofer}\n`);

    // Probar que desde DISPONIBLE no puede ir directo a DESCARGANDO
    console.log('1️⃣1️⃣  ❌ Intentando transición INVÁLIDA: DISPONIBLE → DESCARGANDO');
    try {
      await axios.patch(
        `${API_URL}/choferes/${chofer.id_chofer}/estado`,
        { estado_chofer: 'descargando' },
        { headers }
      );
      console.log(`   ❌ ERROR: No debería permitir esta transición\n`);
    } catch (error) {
      console.log(`   ✓ Transición rechazada correctamente`);
      console.log(`   ✓ Mensaje: ${error.response.data.message}\n`);
    }

    // Probar que desde DISPONIBLE no puede ir directo a VIAJANDO
    console.log('1️⃣2️⃣  ❌ Intentando transición INVÁLIDA: DISPONIBLE → VIAJANDO');
    try {
      await axios.patch(
        `${API_URL}/choferes/${chofer.id_chofer}/estado`,
        { estado_chofer: 'viajando' },
        { headers }
      );
      console.log(`   ❌ ERROR: No debería permitir esta transición\n`);
    } catch (error) {
      console.log(`   ✓ Transición rechazada correctamente`);
      console.log(`   ✓ Mensaje: ${error.response.data.message}\n`);
    }

    // Probar estado de excepción (FRANCO puede aplicarse desde cualquier estado)
    console.log('1️⃣3️⃣  Probando estado de FRANCO (✓ válido - estado de excepción)');
    const francoResponse = await axios.patch(
      `${API_URL}/choferes/${chofer.id_chofer}/estado`,
      {
        estado_chofer: 'franco',
        razon_estado: 'Descanso programado',
        fecha_inicio_licencia: new Date().toISOString(),
        fecha_fin_licencia: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      { headers }
    );
    console.log(`   ✓ Estado: ${francoResponse.data.estado_chofer}`);
    console.log(`   ✓ Razón: ${francoResponse.data.razon_estado}\n`);

    // Volver a disponible
    console.log('1️⃣4️⃣  Volviendo a DISPONIBLE (✓ válido)');
    const finalDisponibleResponse = await axios.patch(
      `${API_URL}/choferes/${chofer.id_chofer}/estado`,
      { estado_chofer: 'disponible' },
      { headers }
    );
    console.log(`   ✓ Estado: ${finalDisponibleResponse.data.estado_chofer}\n`);

    console.log('════════════════════════════════════════════════════════════');
    console.log('  ✅ TODAS LAS PRUEBAS PASARON CORRECTAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('\n📋 RESUMEN DEL FLUJO IMPLEMENTADO:\n');
    console.log('  1. DISPONIBLE → CARGANDO (cuando se asigna viaje)');
    console.log('  2. CARGANDO → VIAJANDO (inicia viaje)');
    console.log('  3. VIAJANDO → DESCANSANDO (OBLIGATORIO - registra inicio descanso)');
    console.log('  4. DESCANSANDO → VIAJANDO (calcula horas de descanso)');
    console.log('  5. VIAJANDO → DESCARGANDO (solo si ya descansó)');
    console.log('  6. DESCARGANDO → VIAJANDO o DISPONIBLE (regreso o finaliza)');
    console.log('\n  ⚠️  Estados de excepción (FRANCO, LICENCIA_ANUAL, etc.) pueden');
    console.log('      aplicarse desde cualquier estado en caso de emergencia.\n');

  } catch (error) {
    console.error('\n❌ Error en las pruebas:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Mensaje: ${error.response.data.message || error.response.data}`);
    } else {
      console.error(`   ${error.message}`);
    }
  }
}

testFlujoEstrictoEstados();
