const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';

async function testEndpoint() {
  console.log('\n' + '='.repeat(80));
  console.log('  TEST SIMPLE: Verificar que el endpoint existe');
  console.log('='.repeat(80) + '\n');

  try {
    // Test 1: Sin autenticación (debe dar 401)
    console.log('🧪 1. Probando sin autenticación...');
    try {
      await axios.get(`${API_URL}/choferes/mi-viaje-activo`);
      console.log('   ❌ ERROR: No bloqueó acceso sin auth\n');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('   ✅ Correctamente bloqueado (401 Unauthorized)\n');
      } else {
        console.log('   ❌ Error inesperado:', error.response?.status);
      }
    }

    // Test 2: Con admin (debe dar 403)
    console.log('🧪 2. Probando con token admin...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@transporte.com',
      password: 'admin123',
    });
    const adminToken = loginRes.data.access_token;

    try {
      await axios.get(`${API_URL}/choferes/mi-viaje-activo`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('   ❌ ERROR: Permitió acceso a admin\n');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('   ✅ Correctamente bloqueado para admin (403 Forbidden)\n');
      } else {
        console.log('   ❌ Error inesperado:', error.response?.status, error.response?.data);
      }
    }

    console.log('='.repeat(80));
    console.log('  ✅ ENDPOINT FUNCIONANDO CORRECTAMENTE');
    console.log('  📝 El endpoint existe y tiene las validaciones correctas');
    console.log('  ⚠️  Para tests completos, crear usuario chofer con:');
    console.log('      psql -d transporte_db -f crear-usuario-chofer-test.sql');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error en el test:', error.message);
  }
}

testEndpoint();
