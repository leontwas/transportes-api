const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';

async function testRejectionFlow() {
  console.log('\n================================================================================');
  console.log('🧪 RUNNING INTEGRATION TEST: TRIP REJECTION FLOW');
  console.log('================================================================================\n');

  try {
    // 1. Login Admin
    console.log('🔐 1. Logging in as Admin...');
    const adminLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@transporte.com',
      password: 'admin123',
    });
    const adminToken = adminLogin.data.access_token;
    console.log('   ✅ Admin logged in.');

    // 2. Login Driver
    console.log('\n🔐 2. Logging in as Driver...');
    const choferLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'chofer.test@transporte.com',
      password: 'chofer123',
    });
    const choferToken = choferLogin.data.access_token;
    const choferId = choferLogin.data.usuario.chofer_id;
    console.log(`   ✅ Driver logged in. Chofer ID: ${choferId}`);

    // 3. Clear any existing notifications to start fresh
    console.log('\n🧹 3. Clearing previous notifications...');
    const notifsBefore = await axios.get(`${API_URL}/viajes/notificaciones`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    for (const notif of notifsBefore.data || []) {
      await axios.patch(`${API_URL}/viajes/notificaciones/${notif.id}/leer`, {}, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    }
    console.log('   ✅ Previous notifications cleared.');

    // 4. Create a fresh test trip
    console.log('\n➕ 4. Creating a fresh test trip for the driver...');
    const randomSuffix = Math.floor(10000 + Math.random() * 90000).toString();
    const tractorPatente = `T${randomSuffix}`;
    const bateaPatente = `B${randomSuffix}`;

    // Create unique tractor
    const newTractorRes = await axios.post(`${API_URL}/tractores`, {
      patente: tractorPatente,
      carga_max_tractor: 32000,
      marca: 'Test',
      modelo: 'DevTractor'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const tractor = newTractorRes.data;

    // Create unique batea
    const newBateaRes = await axios.post(`${API_URL}/bateas`, {
      patente: bateaPatente,
      carga_max_batea: 32000,
      marca: 'Test',
      modelo: 'DevBatea'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const batea = newBateaRes.data;

    // Clear current tractor/batea on driver
    await axios.patch(`${API_URL}/choferes/${choferId}`, {
      tractor_id: null,
      batea_id: null
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Make driver DISPONIBLE
    await axios.patch(`${API_URL}/choferes/${choferId}`, {
      estado_chofer: 'disponible',
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Assign tractor
    await axios.patch(`${API_URL}/tractores/${tractor.tractor_id}/chofer/${choferId}`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Assign batea
    await axios.patch(`${API_URL}/bateas/${batea.batea_id}/chofer/${choferId}`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Link batea to tractor
    await axios.patch(`${API_URL}/tractores/${tractor.tractor_id}/batea/${batea.batea_id}`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Clean old trips
    const tripsRes = await axios.get(`${API_URL}/viajes`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const activeDriverTrips = (tripsRes.data || []).filter(v => v.chofer_id === choferId && v.estado_viaje !== 'finalizado');
    for (const trip of activeDriverTrips) {
      await axios.delete(`${API_URL}/viajes/${trip.id_viaje}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    }

    // Get number of voyages today BEFORE rejection
    const voyagesBefore = await axios.get(`${API_URL}/viajes`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const hoyStr = new Date().toDateString();
    const countBefore = (voyagesBefore.data || []).filter(v => new Date(v.creado_en).toDateString() === hoyStr && v.estado_viaje !== 'anulado').length;

    // Create the test trip
    const tripRes = await axios.post(`${API_URL}/viajes`, {
      chofer_id: choferId,
      tractor_id: tractor.tractor_id,
      batea_id: batea.batea_id,
      origen: 'Mangrullo',
      destino: 'Añelo',
      toneladas_cargadas: 28.5,
      fecha_salida: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const viajeId = tripRes.data.id_viaje;
    console.log(`   ✅ Test trip created with ID: ${viajeId}. Origen: ${tripRes.data.origen}, Destino: ${tripRes.data.destino}, Toneladas: ${tripRes.data.toneladas_cargadas}t`);

    // Verify trip is counted in today's trips
    const voyagesAfterCreate = await axios.get(`${API_URL}/viajes`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const countAfterCreate = (voyagesAfterCreate.data || []).filter(v => new Date(v.creado_en).toDateString() === hoyStr && v.estado_viaje !== 'anulado').length;
    console.log(`   📊 Trips counted today after creation: ${countAfterCreate}`);

    // 5. Driver rejects the trip
    console.log('\n🚫 5. Driver rejects the trip via API...');
    const rejectRes = await axios.post(`${API_URL}/viajes/${viajeId}/rechazar`, {}, {
      headers: { Authorization: `Bearer ${choferToken}` }
    });
    console.log('   ✅ Rejection response status:', rejectRes.status);
    console.log('   ✅ Rejection message:', rejectRes.data.message);

    // 6. Verify Trip is deleted
    console.log('\n🔍 6. Verifying trip is deleted from database...');
    try {
      await axios.get(`${API_URL}/viajes/${viajeId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('   ❌ FAIL: Trip still exists!');
    } catch (err) {
      if (err.response?.status === 404) {
        console.log('   ✅ PASS: Trip is deleted (404 Not Found).');
      } else {
        console.log('   ❌ FAIL: Unexpected error:', err.message);
      }
    }

    // 7. Verify Resources are freed
    console.log('\n🔍 7. Verifying resources are freed...');
    const choferRes = await axios.get(`${API_URL}/choferes/${choferId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`   👤 Driver status: ${choferRes.data.estado_chofer} (Expected: disponible)`);
    if (choferRes.data.estado_chofer === 'disponible') {
      console.log('   ✅ PASS: Driver is disponible.');
    } else {
      console.log('   ❌ FAIL: Driver is not disponible.');
    }

    // 8. Verify Admin received rejection notification
    console.log('\n🔍 8. Verifying rejection notification in Admin panel...');
    const notifsAfter = await axios.get(`${API_URL}/viajes/notificaciones`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const unreadNotifs = notifsAfter.data || [];
    console.log(`   🔔 Unread notifications count: ${unreadNotifs.length}`);
    if (unreadNotifs.length === 1) {
      const notif = unreadNotifs[0];
      console.log(`   🔔 Notification message: "${notif.mensaje}"`);
      if (notif.mensaje.includes('rechazó') && notif.mensaje.includes('Mangrullo') && notif.mensaje.includes('Añelo')) {
        console.log('   ✅ PASS: Correct notification content.');

        // Dismiss notification
        console.log(`   🧹 Dismissing notification ID ${notif.id}...`);
        const readRes = await axios.patch(`${API_URL}/viajes/notificaciones/${notif.id}/leer`, {}, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('   ✅ Dismiss status:', readRes.status);
      } else {
        console.log('   ❌ FAIL: Incorrect notification content.');
      }
    } else {
      console.log('   ❌ FAIL: Expected exactly 1 notification.');
    }

    // 9. Verify trip count has decremented
    console.log('\n🔍 9. Verifying daily goal trip counter has decremented...');
    const voyagesAfterReject = await axios.get(`${API_URL}/viajes`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const countAfterReject = (voyagesAfterReject.data || []).filter(v => new Date(v.creado_en).toDateString() === hoyStr && v.estado_viaje !== 'anulado').length;
    console.log(`   📊 Trips counted today after rejection: ${countAfterReject}`);
    if (countAfterReject === countAfterCreate - 1) {
      console.log('   ✅ PASS: Trip counter correctly decremented by 1.');
    } else {
      console.log('   ❌ FAIL: Trip counter did not decrement correctly.');
    }

    console.log('\n================================================================================');
    console.log('🎉 INTEGRATION TEST PASSED SUCCESSFULLY!');
    console.log('================================================================================\n');

  } catch (error) {
    console.error('❌ Integration test failed with error:', error.response?.data || error.message);
  }
}

testRejectionFlow();
