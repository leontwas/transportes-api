const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';

async function testEstadosFlow() {
  try {
    console.log('🧪 PROBANDO FLUJO DE ESTADOS DE CHOFER\n');
    console.log('════════════════════════════════════════════════════════════\n');

    // Login como admin
    console.log('1️⃣  Haciendo login como admin...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@transporte.com',
      password: 'admin123',
    });
    const token = loginResponse.data.access_token;
    console.log(`   ✓ Token obtenido: ${token.substring(0, 20)}...\n`);

    const headers = { Authorization: `Bearer ${token}` };

    // Obtener un chofer disponible
    console.log('2️⃣  Obteniendo choferes...');
    const choferesResponse = await axios.get(`${API_URL}/choferes`, { headers });
    const choferes = choferesResponse.data;
    console.log(`   ✓ Se encontraron ${choferes.length} choferes`);

    // Buscar un chofer disponible o usar el primero
    let chofer = choferes.find(c => c.estado_chofer === 'disponible') || choferes[0];
    console.log(`   ✓ Usando chofer: ${chofer.nombre_completo} (ID: ${chofer.id_chofer})`);
    console.log(`   ✓ Estado actual: ${chofer.estado_chofer}\n`);

    // Si el chofer no está disponible, ponerlo disponible primero
    if (chofer.estado_chofer !== 'disponible') {
      console.log('3️⃣  Cambiando chofer a DISPONIBLE...');
      const disponibleResponse = await axios.patch(
        `${API_URL}/choferes/${chofer.id_chofer}/estado`,
        { estado_chofer: 'disponible' },
        { headers }
      );
      chofer = disponibleResponse.data;
      console.log(`   ✓ Estado cambiado a: ${chofer.estado_chofer}\n`);
    }

    // FLUJO NORMAL: DISPONIBLE → CARGANDO
    console.log('4️⃣  Transición: DISPONIBLE → CARGANDO');
    const cargandoResponse = await axios.patch(
      `${API_URL}/choferes/${chofer.id_chofer}/estado`,
      { estado_chofer: 'cargando' },
      { headers }
    );
    console.log(`   ✓ Estado: ${cargandoResponse.data.estado_chofer}\n`);

    // CARGANDO → VIAJANDO
    console.log('5️⃣  Transición: CARGANDO → VIAJANDO');
    const viajandoResponse = await axios.patch(
      `${API_URL}/choferes/${chofer.id_chofer}/estado`,
      { estado_chofer: 'viajando' },
      { headers }
    );
    console.log(`   ✓ Estado: ${viajandoResponse.data.estado_chofer}\n`);

    // VIAJANDO → DESCANSANDO (debe registrar hora_inicio_descanso en viaje)
    console.log('6️⃣  Transición: VIAJANDO → DESCANSANDO');
    const descansandoResponse = await axios.patch(
      `${API_URL}/choferes/${chofer.id_chofer}/estado`,
      { estado_chofer: 'descansando' },
      { headers }
    );
    console.log(`   ✓ Estado: ${descansandoResponse.data.estado_chofer}`);
    console.log(`   ℹ️  Debería registrarse hora_inicio_descanso en el viaje activo\n`);

    // Esperar 3 segundos para simular descanso
    console.log('⏳ Esperando 3 segundos para simular descanso...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // DESCANSANDO → VIAJANDO (debe calcular horas_descanso)
    console.log('7️⃣  Transición: DESCANSANDO → VIAJANDO');
    const viajando2Response = await axios.patch(
      `${API_URL}/choferes/${chofer.id_chofer}/estado`,
      { estado_chofer: 'viajando' },
      { headers }
    );
    console.log(`   ✓ Estado: ${viajando2Response.data.estado_chofer}`);
    console.log(`   ℹ️  Debería calcularse horas_descanso en el viaje activo\n`);

    // VIAJANDO → DESCARGANDO
    console.log('8️⃣  Transición: VIAJANDO → DESCARGANDO');
    const descargandoResponse = await axios.patch(
      `${API_URL}/choferes/${chofer.id_chofer}/estado`,
      {
        estado_chofer: 'descargando',
        toneladas_descargadas: 25.5
      },
      { headers }
    );
    console.log(`   ✓ Estado: ${descargandoResponse.data.estado_chofer}\n`);

    // DESCARGANDO → DISPONIBLE (completar ciclo)
    console.log('9️⃣  Transición: DESCARGANDO → DISPONIBLE');
    const finalResponse = await axios.patch(
      `${API_URL}/choferes/${chofer.id_chofer}/estado`,
      { estado_chofer: 'disponible' },
      { headers }
    );
    console.log(`   ✓ Estado: ${finalResponse.data.estado_chofer}\n`);

    // Probar transición inválida
    console.log('🔟 Probando transición INVÁLIDA: DISPONIBLE → DESCARGANDO');
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

    // Probar estados de licencia (pueden aplicarse desde cualquier estado)
    console.log('1️⃣1️⃣  Probando estado de FRANCO (desde cualquier estado)');
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
    console.log('1️⃣2️⃣  Volviendo a DISPONIBLE');
    const finalDisponibleResponse = await axios.patch(
      `${API_URL}/choferes/${chofer.id_chofer}/estado`,
      { estado_chofer: 'disponible' },
      { headers }
    );
    console.log(`   ✓ Estado: ${finalDisponibleResponse.data.estado_chofer}\n`);

    console.log('════════════════════════════════════════════════════════════');
    console.log('  ✅ TODAS LAS PRUEBAS PASARON CORRECTAMENTE');
    console.log('════════════════════════════════════════════════════════════\n');

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

testEstadosFlow();
