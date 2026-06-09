const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';

async function run() {
  try {
    console.log('🔐 Logging in as Admin...');
    const adminLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@transporte.com',
      password: 'admin123',
    });
    const adminToken = adminLogin.data.access_token;
    console.log('✅ Admin login successful');

    console.log('🔐 Logging in as Driver...');
    const choferLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'chofer.test@transporte.com',
      password: 'chofer123',
    });
    const choferToken = choferLogin.data.access_token;
    const choferId = choferLogin.data.usuario.chofer_id;
    console.log(`✅ Driver login successful. Chofer ID: ${choferId}`);

    const randomSuffix = Math.floor(10000 + Math.random() * 90000).toString();
    const tractorPatente = `T${randomSuffix}`;
    const bateaPatente = `B${randomSuffix}`;

    // Clear current tractor and batea from our driver to avoid 409
    console.log(`🧹 Clearing current tractor/batea from driver ${choferId}...`);
    await axios.patch(`${API_URL}/choferes/${choferId}`, {
      tractor_id: null,
      batea_id: null
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    }).catch(err => console.log('   (Note) Error clearing driver links:', err.message));

    console.log(`➕ Creating new unique tractor ${tractorPatente}...`);
    const newTractorRes = await axios.post(`${API_URL}/tractores`, {
      patente: tractorPatente,
      carga_max_tractor: 32000,
      marca: 'Test',
      modelo: 'DevTractor'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const tractor = newTractorRes.data;

    console.log(`➕ Creating new unique batea ${bateaPatente}...`);
    const newBateaRes = await axios.post(`${API_URL}/bateas`, {
      patente: bateaPatente,
      carga_max_batea: 32000,
      marca: 'Test',
      modelo: 'DevBatea'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const batea = newBateaRes.data;

    console.log(`🚜 Selected Tractor: ${tractor.patente} (ID: ${tractor.tractor_id})`);
    console.log(`🚚 Selected Batea: ${batea.patente} (ID: ${batea.batea_id})`);

    // Put chofer in DISPONIBLE state first so they can receive a trip
    console.log('👤 Setting driver state to DISPONIBLE...');
    await axios.patch(`${API_URL}/choferes/${choferId}`, {
      estado_chofer: 'disponible',
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    // Assign tractor to chofer
    console.log('🔗 Assigning tractor to driver...');
    await axios.patch(`${API_URL}/tractores/${tractor.tractor_id}/chofer/${choferId}`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Assign batea to chofer
    console.log('🔗 Assigning batea to driver...');
    await axios.patch(`${API_URL}/bateas/${batea.batea_id}/chofer/${choferId}`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Assign batea to tractor
    console.log('🔗 Linking batea to tractor...');
    await axios.patch(`${API_URL}/tractores/${tractor.tractor_id}/batea/${batea.batea_id}`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Delete any active trip for this driver first to prevent conflicts
    console.log('🧹 Cleaning old trips for this driver...');
    const tripsRes = await axios.get(`${API_URL}/viajes`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const activeDriverTrips = (tripsRes.data || []).filter(v => v.chofer_id === choferId && v.estado_viaje !== 'finalizado');
    for (const trip of activeDriverTrips) {
      console.log(`🗑️ Deleting old trip ID ${trip.id_viaje}...`);
      await axios.delete(`${API_URL}/viajes/${trip.id_viaje}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    }

    // Create a new trip
    console.log('➕ Creating new trip...');
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

    console.log('🎉 Test data prepared successfully!');
    console.log('Trip Details:', tripRes.data);
  } catch (error) {
    console.error('❌ Error preparing test data:', error.response?.data || error.message);
  }
}

run();
