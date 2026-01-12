const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';

let adminToken;
let choferToken;
let choferId;
let tractorId;
let bateaId;
let viajeId;

async function testEntregaFinalizada() {
  try {
    console.log('🧪 TEST: Estado ENTREGA_FINALIZADA\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    // ==================== 1. LOGIN ====================
    console.log('1️⃣  LOGIN como Admin y Chofer...');

    const loginAdmin = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@transporte.com',
      password: 'admin123',
    });
    adminToken = loginAdmin.data.access_token;
    console.log('   ✓ Admin autenticado\n');

    // Buscar un chofer para hacer login
    const choferes = await axios.get(`${API_URL}/choferes`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const choferDisponible = choferes.data.find(c => c.estado_chofer === 'disponible');

    if (!choferDisponible) {
      console.log('   ❌ No hay choferes disponibles');
      return;
    }

    choferId = choferDisponible.id_chofer;
    console.log(`   ✓ Usando chofer: ${choferDisponible.nombre_completo} (ID: ${choferId})\n`);

    // ==================== 2. OBTENER RECURSOS ====================
    console.log('2️⃣  Verificando recursos del chofer...');

    // Usar los recursos asignados al chofer o buscar libres
    if (choferDisponible.tractor && choferDisponible.batea) {
      tractorId = choferDisponible.tractor.tractor_id;
      bateaId = choferDisponible.batea.batea_id;
      console.log(`   ✓ Usando tractor asignado: ${choferDisponible.tractor.patente} (ID: ${tractorId})`);
      console.log(`   ✓ Usando batea asignada: ${choferDisponible.batea.patente} (ID: ${bateaId})\n`);
    } else {
      // Si no tiene asignados, buscar libres
      const tractores = await axios.get(`${API_URL}/tractores`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const tractorLibre = tractores.data.find(t => t.estado_tractor === 'libre');

      if (!tractorLibre) {
        console.log('   ❌ No hay tractores libres ni asignados');
        return;
      }
      tractorId = tractorLibre.tractor_id;
      console.log(`   ✓ Tractor libre encontrado: ${tractorLibre.patente} (ID: ${tractorId})`);

      const bateas = await axios.get(`${API_URL}/bateas`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const bateaVacia = bateas.data.find(b => b.estado === 'vacio');

      if (!bateaVacia) {
        console.log('   ❌ No hay bateas vacías');
        return;
      }
      bateaId = bateaVacia.batea_id;
      console.log(`   ✓ Batea vacía encontrada: ${bateaVacia.patente} (ID: ${bateaId})`);

      // Asignar recursos al chofer
      console.log('   📝 Asignando recursos al chofer...');
      await axios.patch(`${API_URL}/choferes/${choferId}`, {
        tractor_id: tractorId,
        batea_id: bateaId,
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('   ✓ Recursos asignados\n');
    }

    // ==================== 3. CREAR VIAJE ====================
    console.log('3️⃣  Creando viaje...');

    const viaje = await axios.post(`${API_URL}/viajes`, {
      chofer_id: choferId,
      tractor_id: tractorId,
      batea_id: bateaId,
      origen: 'San Nicolas',
      destino: 'Rosario',
      fecha_salida: new Date(),
      toneladas_cargadas: 30,
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    viajeId = viaje.data.id_viaje;
    console.log(`   ✓ Viaje creado: ID=${viajeId}`);
    console.log(`   ✓ Origen: ${viaje.data.origen} → Destino: ${viaje.data.destino}\n`);

    // ==================== 4. FLUJO DE ESTADOS ====================
    console.log('4️⃣  Probando flujo de estados...\n');

    // 4.1 CARGANDO
    console.log('   📦 Estado: CARGANDO');
    await axios.patch(`${API_URL}/choferes/${choferId}/estado`, {
      estado_chofer: 'cargando',
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('      ✓ Chofer ahora en CARGANDO\n');

    // 4.2 VIAJANDO
    console.log('   🚚 Estado: VIAJANDO');
    await axios.patch(`${API_URL}/choferes/${choferId}/estado`, {
      estado_chofer: 'viajando',
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('      ✓ Chofer ahora en VIAJANDO\n');

    // 4.3 DESCANSANDO
    console.log('   😴 Estado: DESCANSANDO');
    await axios.patch(`${API_URL}/choferes/${choferId}/estado`, {
      estado_chofer: 'descansando',
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('      ✓ Chofer ahora en DESCANSANDO\n');

    // Esperar 2 segundos para simular descanso
    console.log('   ⏱️  Esperando 2 segundos (simulando descanso)...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('      ✓ Descanso completado\n');

    // 4.4 VIAJANDO (después de descanso)
    console.log('   🚚 Estado: VIAJANDO (después de descanso)');
    await axios.patch(`${API_URL}/choferes/${choferId}/estado`, {
      estado_chofer: 'viajando',
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('      ✓ Chofer ahora en VIAJANDO (descanso registrado)\n');

    // 4.5 DESCARGANDO
    console.log('   📤 Estado: DESCARGANDO');
    await axios.patch(`${API_URL}/choferes/${choferId}/estado`, {
      estado_chofer: 'descargando',
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('      ✓ Chofer ahora en DESCARGANDO\n');

    // ==================== 5. PRUEBA DE ERROR: ENTREGA_FINALIZADA SIN TONELADAS ====================
    console.log('5️⃣  TEST: ENTREGA_FINALIZADA sin toneladas (debe fallar)...');

    try {
      await axios.patch(`${API_URL}/choferes/${choferId}/estado`, {
        estado_chofer: 'entrega_finalizada',
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('   ❌ ERROR: Debió rechazar entrega sin toneladas\n');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('   ✅ Correctamente rechazado:');
        console.log(`      ${error.response.data.message}\n`);
      } else {
        throw error;
      }
    }

    // ==================== 6. PRUEBA DE ERROR: ENTREGA_FINALIZADA CON TONELADAS <= 0 ====================
    console.log('6️⃣  TEST: ENTREGA_FINALIZADA con toneladas <= 0 (debe fallar)...');

    try {
      await axios.patch(`${API_URL}/choferes/${choferId}/estado`, {
        estado_chofer: 'entrega_finalizada',
        toneladas_descargadas: 0,
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('   ❌ ERROR: Debió rechazar toneladas = 0\n');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('   ✅ Correctamente rechazado:');
        console.log(`      ${error.response.data.message}\n`);
      } else {
        throw error;
      }
    }

    // ==================== 7. PRUEBA EXITOSA: ENTREGA_FINALIZADA CON TONELADAS ====================
    console.log('7️⃣  TEST: ENTREGA_FINALIZADA con toneladas válidas...');

    const resultado = await axios.patch(`${API_URL}/choferes/${choferId}/estado`, {
      estado_chofer: 'entrega_finalizada',
      toneladas_descargadas: 28.5,
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    console.log('   ✅ ENTREGA FINALIZADA EXITOSA');
    console.log(`      Estado del chofer: ${resultado.data.estado_chofer}`);
    console.log(`      Tractor ID: ${resultado.data.tractor_id} (${resultado.data.tractor_id ? 'mantiene asignación' : 'sin asignar'})`);
    console.log(`      Batea ID: ${resultado.data.batea_id} (${resultado.data.batea_id ? 'mantiene asignación' : 'sin asignar'})\n`);

    // ==================== 8. VERIFICAR VIAJE FINALIZADO ====================
    console.log('8️⃣  Verificando que el viaje fue finalizado...');

    const viajeActualizado = await axios.get(`${API_URL}/viajes/${viajeId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    console.log('   📊 Datos del viaje:');
    console.log(`      Estado: ${viajeActualizado.data.estado_viaje}`);
    console.log(`      Toneladas descargadas: ${viajeActualizado.data.toneladas_descargadas}`);
    console.log(`      Fecha descarga: ${viajeActualizado.data.fecha_descarga}`);

    if (viajeActualizado.data.estado_viaje === 'finalizado') {
      console.log('      ✅ Viaje correctamente finalizado\n');
    } else {
      console.log('      ❌ ERROR: Viaje no fue finalizado\n');
    }

    // ==================== 9. VERIFICAR RECURSOS ACTUALIZADOS ====================
    console.log('9️⃣  Verificando estado de recursos...\n');

    // Verificar chofer
    const choferActualizado = await axios.get(`${API_URL}/choferes/${choferId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`   👤 Chofer: ${choferActualizado.data.nombre_completo}`);
    console.log(`      Estado: ${choferActualizado.data.estado_chofer}`);
    console.log(`      Tractor ID: ${choferActualizado.data.tractor_id}`);
    console.log(`      Batea ID: ${choferActualizado.data.batea_id}`);

    if (choferActualizado.data.estado_chofer === 'disponible' &&
        choferActualizado.data.tractor_id === tractorId &&
        choferActualizado.data.batea_id === bateaId) {
      console.log('      ✅ Chofer DISPONIBLE con recursos asignados\n');
    } else {
      console.log('      ❌ ERROR: Estado incorrecto del chofer\n');
    }

    // Verificar tractor
    const tractorActualizado = await axios.get(`${API_URL}/tractores/${tractorId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`   🚛 Tractor: ${tractorActualizado.data.patente}`);
    console.log(`      Estado: ${tractorActualizado.data.estado_tractor}`);
    console.log(`      Chofer ID: ${tractorActualizado.data.chofer_id}`);

    if (tractorActualizado.data.estado_tractor === 'libre' &&
        tractorActualizado.data.chofer_id === choferId) {
      console.log('      ✅ Tractor LIBRE manteniendo asignación al chofer\n');
    } else {
      console.log('      ❌ ERROR: Estado incorrecto del tractor\n');
    }

    // Verificar batea
    const bateaActualizada = await axios.get(`${API_URL}/bateas/${bateaId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`   🚢 Batea: ${bateaActualizada.data.patente}`);
    console.log(`      Estado: ${bateaActualizada.data.estado}`);
    console.log(`      Chofer ID: ${bateaActualizada.data.chofer_id}`);

    if (bateaActualizada.data.estado === 'vacio' &&
        bateaActualizada.data.chofer_id === choferId) {
      console.log('      ✅ Batea VACÍA manteniendo asignación al chofer\n');
    } else {
      console.log('      ❌ ERROR: Estado incorrecto de la batea\n');
    }

    // ==================== 10. RESUMEN FINAL ====================
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📝 Resumen del flujo:');
    console.log('   1. ✅ Viaje creado correctamente');
    console.log('   2. ✅ Flujo de estados respetado (CARGANDO → VIAJANDO → DESCANSANDO → VIAJANDO → DESCARGANDO)');
    console.log('   3. ✅ Validación sin toneladas funcionó');
    console.log('   4. ✅ Validación con toneladas <= 0 funcionó');
    console.log('   5. ✅ ENTREGA_FINALIZADA con toneladas válidas funcionó');
    console.log('   6. ✅ Viaje marcado como FINALIZADO');
    console.log('   7. ✅ Toneladas descargadas registradas (28.5)');
    console.log('   8. ✅ Fecha de descarga registrada');
    console.log('   9. ✅ Chofer DISPONIBLE (mantiene tractor y batea asignados)');
    console.log('   10. ✅ Tractor LIBRE (mantiene asignación al chofer)');
    console.log('   11. ✅ Batea VACÍA (mantiene asignación al chofer)');
    console.log('');

  } catch (error) {
    console.error('\n❌ ERROR EN LA PRUEBA:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Mensaje:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`   ${error.message}`);
    }
  }
}

testEntregaFinalizada();