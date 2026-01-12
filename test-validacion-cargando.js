const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';

// Credenciales de prueba
const ADMIN_EMAIL = 'admin@transporte.com';
const ADMIN_PASSWORD = 'admin123';

let adminToken = '';
let choferId = null;
let tractorId = null;
let bateaId = null;
let viajeId = null;

async function login() {
  console.log('\n🔐 1. Iniciando sesión como admin...\n');
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    adminToken = response.data.access_token;
    console.log('   ✅ Login exitoso\n');
  } catch (error) {
    console.error('   ❌ Error en login:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function obtenerRecursos() {
  console.log('📋 2. Obteniendo recursos disponibles...\n');

  try {
    // Obtener chofer disponible
    const choferesRes = await axios.get(`${API_URL}/choferes`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Buscar chofer disponible SIN viaje activo
    const choferDisponible = choferesRes.data.find(c =>
      c.estado_chofer === 'disponible' &&
      c.tractor_id !== null &&
      c.batea_id !== null
    );

    if (choferDisponible) {
      choferId = choferDisponible.id_chofer;
      tractorId = choferDisponible.tractor_id;
      bateaId = choferDisponible.batea_id;

      // Verificar que NO tenga viaje activo
      const viajesRes = await axios.get(`${API_URL}/viajes`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      const viajeActivo = viajesRes.data.find(v =>
        v.chofer_id === choferId &&
        v.estado_viaje !== 'finalizado'
      );

      if (viajeActivo) {
        // Eliminar viaje activo si existe
        console.log(`   ℹ️  Eliminando viaje activo ${viajeActivo.id_viaje} del chofer...\n`);
        await axios.delete(`${API_URL}/viajes/${viajeActivo.id_viaje}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
      }

      console.log(`   ✅ Chofer encontrado: ${choferDisponible.nombre_completo} (ID ${choferId})`);
      console.log(`   ✅ Tractor: ID ${tractorId}`);
      console.log(`   ✅ Batea: ID ${bateaId}\n`);
      return;
    }

    if (!choferDisponible) {
      console.log('   ℹ️  No hay chofer disponible con recursos asignados');
      console.log('   📝 Creando chofer de prueba...\n');

      // Obtener tractor y batea disponibles
      const tractoresRes = await axios.get(`${API_URL}/tractores`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const bateasRes = await axios.get(`${API_URL}/bateas`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      const tractorLibre = tractoresRes.data.find(t => t.estado_tractor === 'libre' && !t.chofer_id);
      const bateaVacia = bateasRes.data.find(b => b.estado === 'vacio' && !b.chofer_id);

      if (!tractorLibre || !bateaVacia) {
        console.error('   ❌ No hay recursos disponibles');
        process.exit(1);
      }

      // Crear chofer
      const nuevoChofer = await axios.post(`${API_URL}/choferes`, {
        nombre_completo: 'Chofer Prueba Validación',
        estado_chofer: 'disponible'
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      choferId = nuevoChofer.data.id_chofer;
      tractorId = tractorLibre.tractor_id;
      bateaId = bateaVacia.batea_id;

      // Asignar recursos
      await axios.patch(`${API_URL}/choferes/${choferId}`, {
        tractor_id: tractorId,
        batea_id: bateaId
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      console.log(`   ✅ Chofer creado: ID ${choferId}`);
      console.log(`   ✅ Tractor asignado: ID ${tractorId}`);
      console.log(`   ✅ Batea asignada: ID ${bateaId}\n`);

    } else {
      choferId = choferDisponible.id_chofer;
      tractorId = choferDisponible.tractor_id;
      bateaId = choferDisponible.batea_id;

      console.log(`   ✅ Chofer encontrado: ${choferDisponible.nombre_completo} (ID ${choferId})`);
      console.log(`   ✅ Tractor: ID ${tractorId}`);
      console.log(`   ✅ Batea: ID ${bateaId}\n`);
    }

  } catch (error) {
    console.error('   ❌ Error obteniendo recursos:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function testCargandoSinViaje() {
  console.log('🧪 3. TEST: Intentar cambiar a CARGANDO sin viaje asignado...\n');

  try {
    await axios.patch(`${API_URL}/choferes/${choferId}/estado`, {
      estado_chofer: 'cargando'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    console.log('   ❌ ERROR: La validación NO funcionó. El chofer pudo cambiar a CARGANDO sin viaje\n');
    return false;

  } catch (error) {
    if (error.response?.status === 400) {
      console.log('   ✅ Validación correcta: Se rechazó el cambio a CARGANDO');
      console.log(`   📝 Mensaje: "${error.response.data.message}"\n`);
      return true;
    } else {
      console.error('   ❌ Error inesperado:', error.response?.data || error.message);
      return false;
    }
  }
}

async function asignarViaje() {
  console.log('📦 4. Asignando viaje al chofer...\n');

  try {
    const nuevoViaje = await axios.post(`${API_URL}/viajes`, {
      chofer_id: choferId,
      tractor_id: tractorId,
      batea_id: bateaId,
      origen: 'San Nicolas',
      destino: 'Rosario',
      toneladas_cargadas: 30
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    viajeId = nuevoViaje.data.id_viaje;
    console.log(`   ✅ Viaje creado: ID ${viajeId}`);
    console.log(`   📍 Ruta: ${nuevoViaje.data.origen} → ${nuevoViaje.data.destino}`);
    console.log(`   ⚖️  Toneladas: ${nuevoViaje.data.toneladas_cargadas}\n`);

  } catch (error) {
    console.error('   ❌ Error creando viaje:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function testCargandoConViaje() {
  console.log('🧪 5. TEST: Intentar cambiar a CARGANDO con viaje asignado...\n');

  try {
    const response = await axios.patch(`${API_URL}/choferes/${choferId}/estado`, {
      estado_chofer: 'cargando'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    console.log('   ✅ Validación correcta: El chofer cambió a CARGANDO');
    console.log(`   📝 Estado del chofer: ${response.data.estado_chofer}`);
    console.log(`   📝 Viaje asignado: ID ${viajeId}\n`);
    return true;

  } catch (error) {
    console.error('   ❌ ERROR: La validación falló incorrectamente');
    console.error(`   📝 Mensaje: "${error.response?.data?.message}"\n`);
    return false;
  }
}

async function verificarEstadoViaje() {
  console.log('🔍 6. Verificando que el viaje cambió a CARGANDO...\n');

  try {
    const viajeRes = await axios.get(`${API_URL}/viajes/${viajeId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (viajeRes.data.estado_viaje === 'cargando') {
      console.log('   ✅ El viaje cambió correctamente a CARGANDO');
      console.log(`   📝 Estado del viaje: ${viajeRes.data.estado_viaje}\n`);
      return true;
    } else {
      console.log(`   ❌ El viaje NO cambió a CARGANDO (estado actual: ${viajeRes.data.estado_viaje})\n`);
      return false;
    }

  } catch (error) {
    console.error('   ❌ Error verificando viaje:', error.response?.data || error.message);
    return false;
  }
}

async function limpiarRecursos() {
  console.log('🧹 7. Limpiando recursos de prueba...\n');

  try {
    // Eliminar viaje
    if (viajeId) {
      await axios.delete(`${API_URL}/viajes/${viajeId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log(`   ✅ Viaje ${viajeId} eliminado`);
    }

    // Volver chofer a disponible y desasignar recursos
    if (choferId) {
      await axios.patch(`${API_URL}/choferes/${choferId}`, {
        tractor_id: null,
        batea_id: null
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log(`   ✅ Chofer ${choferId} desasignado de recursos\n`);
    }

  } catch (error) {
    console.error('   ⚠️  Error limpiando recursos:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('  TEST: VALIDACIÓN CARGANDO - REQUIERE VIAJE ASIGNADO');
  console.log('='.repeat(80));

  await login();
  await obtenerRecursos();

  const test1 = await testCargandoSinViaje();
  await asignarViaje();
  const test2 = await testCargandoConViaje();
  const test3 = await verificarEstadoViaje();

  await limpiarRecursos();

  console.log('='.repeat(80));
  console.log('  RESUMEN DE RESULTADOS');
  console.log('='.repeat(80));
  console.log(`\n  1. ${test1 ? '✅' : '❌'} Rechazo de CARGANDO sin viaje asignado`);
  console.log(`  2. ${test2 ? '✅' : '❌'} Permiso de CARGANDO con viaje asignado`);
  console.log(`  3. ${test3 ? '✅' : '❌'} Actualización correcta del estado del viaje\n`);

  if (test1 && test2 && test3) {
    console.log('  🎉 TODOS LOS TESTS PASARON EXITOSAMENTE\n');
    console.log('='.repeat(80) + '\n');
  } else {
    console.log('  ⚠️  ALGUNOS TESTS FALLARON\n');
    console.log('='.repeat(80) + '\n');
    process.exit(1);
  }
}

runTests();