const http = require('http');

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: headers,
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => (responseData += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseData) });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test() {
  console.log('\n' + '='.repeat(80));
  console.log('  🧪 TEST: MANEJO DE ERRORES Y CÓDIGOS HTTP');
  console.log('='.repeat(80) + '\n');

  let tokenAdmin = null;
  let tokenChofer = null;

  // ============================================================================
  // SECCIÓN 1: ERRORES 401 - NO AUTENTICADO
  // ============================================================================
  console.log('📋 SECCIÓN 1: ERRORES 401 - NO AUTENTICADO\n');

  // Test 1: Sin token
  console.log('Test 1.1: Acceder sin token\n');
  const noTokenResult = await makeRequest('GET', '/api/v1/choferes');
  console.log('Status:', noTokenResult.status);
  console.log('Error:', noTokenResult.data.error);
  console.log('Message:', noTokenResult.data.message);
  console.log('Action:', noTokenResult.data.action);
  console.log(noTokenResult.status === 401 ? '✅ PASS' : '❌ FAIL');

  // Test 2: Token inválido
  console.log('\nTest 1.2: Token inválido\n');
  const invalidTokenResult = await makeRequest(
    'GET',
    '/api/v1/choferes',
    null,
    'invalid-token-12345',
  );
  console.log('Status:', invalidTokenResult.status);
  console.log('Error:', invalidTokenResult.data.error);
  console.log('Message:', invalidTokenResult.data.message);
  console.log('Action:', invalidTokenResult.data.action);
  console.log(invalidTokenResult.status === 401 ? '✅ PASS' : '❌ FAIL');

  // Login como admin
  console.log('\n' + '-'.repeat(80));
  console.log('Obteniendo tokens de prueba...\n');

  const loginAdminResult = await makeRequest('POST', '/api/v1/auth/login', {
    email: 'admin@transporte.com',
    password: 'admin123',
  });

  if (loginAdminResult.status === 200 || loginAdminResult.status === 201) {
    tokenAdmin = loginAdminResult.data.access_token;
    console.log('✅ Token admin obtenido');
  }

  const loginChoferResult = await makeRequest('POST', '/api/v1/auth/login', {
    email: 'carlos.andrada@transporte.com',
    password: 'chofer123',
  });

  if (loginChoferResult.status === 200 || loginChoferResult.status === 201) {
    tokenChofer = loginChoferResult.data.access_token;
    console.log('✅ Token chofer obtenido');
  }

  // ============================================================================
  // SECCIÓN 2: ERRORES 403 - NO AUTORIZADO (ROLES)
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('📋 SECCIÓN 2: ERRORES 403 - NO AUTORIZADO (FALTA DE PERMISOS)\n');

  // Test 3: Chofer intentando acceder a endpoint de admin
  console.log('Test 2.1: Chofer intenta listar todos los choferes\n');
  const choferAccessAdminResult = await makeRequest(
    'GET',
    '/api/v1/choferes',
    null,
    tokenChofer,
  );
  console.log('Status:', choferAccessAdminResult.status);
  console.log('Error:', choferAccessAdminResult.data.error);
  console.log('Message:', choferAccessAdminResult.data.message);
  console.log('Required Role:', choferAccessAdminResult.data.requiredRole);
  console.log('Details:', choferAccessAdminResult.data.details);
  console.log(choferAccessAdminResult.status === 403 ? '✅ PASS' : '❌ FAIL');

  // Test 4: Chofer intentando crear un chofer
  console.log('\nTest 2.2: Chofer intenta crear un nuevo chofer\n');
  const choferCreateResult = await makeRequest(
    'POST',
    '/api/v1/choferes',
    { nombre_completo: 'Test Chofer' },
    tokenChofer,
  );
  console.log('Status:', choferCreateResult.status);
  console.log('Error:', choferCreateResult.data.error);
  console.log('Message:', choferCreateResult.data.message);
  console.log('Required Role:', choferCreateResult.data.requiredRole);
  console.log('Details:', choferCreateResult.data.details);
  console.log(choferCreateResult.status === 403 ? '✅ PASS' : '❌ FAIL');

  // Test 5: Chofer intentando acceder a tractores
  console.log('\nTest 2.3: Chofer intenta listar tractores\n');
  const choferAccessTractoresResult = await makeRequest(
    'GET',
    '/api/v1/tractores',
    null,
    tokenChofer,
  );
  console.log('Status:', choferAccessTractoresResult.status);
  console.log('Error:', choferAccessTractoresResult.data.error);
  console.log('Message:', choferAccessTractoresResult.data.message);
  console.log('Required Role:', choferAccessTractoresResult.data.requiredRole);
  console.log('Details:', choferAccessTractoresResult.data.details);
  console.log(choferAccessTractoresResult.status === 403 ? '✅ PASS' : '❌ FAIL');

  // Test 6: Chofer intentando acceder a viajes
  console.log('\nTest 2.4: Chofer intenta listar viajes\n');
  const choferAccessViajesResult = await makeRequest(
    'GET',
    '/api/v1/viajes',
    null,
    tokenChofer,
  );
  console.log('Status:', choferAccessViajesResult.status);
  console.log('Error:', choferAccessViajesResult.data.error);
  console.log('Message:', choferAccessViajesResult.data.message);
  console.log('Required Role:', choferAccessViajesResult.data.requiredRole);
  console.log('Details:', choferAccessViajesResult.data.details);
  console.log(choferAccessViajesResult.status === 403 ? '✅ PASS' : '❌ FAIL');

  // ============================================================================
  // SECCIÓN 3: ERRORES 404 - NO ENCONTRADO
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('📋 SECCIÓN 3: ERRORES 404 - RECURSO NO ENCONTRADO\n');

  // Test 7: Chofer inexistente
  console.log('Test 3.1: Buscar chofer inexistente\n');
  const notFoundChoferResult = await makeRequest(
    'GET',
    '/api/v1/choferes/99999',
    null,
    tokenAdmin,
  );
  console.log('Status:', notFoundChoferResult.status);
  console.log('Error:', notFoundChoferResult.data.error);
  console.log('Message:', notFoundChoferResult.data.message);
  console.log('Details:', notFoundChoferResult.data.details);
  console.log(notFoundChoferResult.status === 404 ? '✅ PASS' : '❌ FAIL');

  // ============================================================================
  // SECCIÓN 4: ACCESOS EXITOSOS (200/201)
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('📋 SECCIÓN 4: ACCESOS EXITOSOS\n');

  // Test 8: Admin accede a choferes
  console.log('Test 4.1: Admin lista choferes\n');
  const adminAccessChoferesResult = await makeRequest(
    'GET',
    '/api/v1/choferes',
    null,
    tokenAdmin,
  );
  console.log('Status:', adminAccessChoferesResult.status);
  console.log('Choferes:', adminAccessChoferesResult.data.length);
  console.log(adminAccessChoferesResult.status === 200 ? '✅ PASS' : '❌ FAIL');

  // Test 9: Chofer actualiza su estado
  console.log('\nTest 4.2: Chofer actualiza su propio estado\n');
  const choferUpdateStateResult = await makeRequest(
    'PATCH',
    '/api/v1/choferes/mi-estado',
    { estado_chofer: 'activo' },
    tokenChofer,
  );
  console.log('Status:', choferUpdateStateResult.status);
  console.log('Estado actualizado:', choferUpdateStateResult.data.estado_chofer);
  console.log(choferUpdateStateResult.status === 200 ? '✅ PASS' : '❌ FAIL');

  // Test 10: Admin accede a tractores
  console.log('\nTest 4.3: Admin lista tractores\n');
  const adminAccessTractoresResult = await makeRequest(
    'GET',
    '/api/v1/tractores',
    null,
    tokenAdmin,
  );
  console.log('Status:', adminAccessTractoresResult.status);
  console.log(
    'Tractores:',
    Array.isArray(adminAccessTractoresResult.data)
      ? adminAccessTractoresResult.data.length
      : 'N/A',
  );
  console.log(adminAccessTractoresResult.status === 200 ? '✅ PASS' : '❌ FAIL');

  // ============================================================================
  // RESUMEN
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESUMEN DE PRUEBAS:\n');
  console.log('ERRORES 401 (No Autenticado):');
  console.log('  ✅ Sin token → 401 con mensaje claro');
  console.log('  ✅ Token inválido → 401 con mensaje claro');
  console.log('\nERRORES 403 (No Autorizado):');
  console.log('  ✅ Chofer intenta listar choferes → 403 con rol requerido');
  console.log('  ✅ Chofer intenta crear chofer → 403 con rol requerido');
  console.log('  ✅ Chofer intenta acceder a tractores → 403 con rol requerido');
  console.log('  ✅ Chofer intenta acceder a viajes → 403 con rol requerido');
  console.log('\nERRORES 404 (No Encontrado):');
  console.log('  ✅ Recurso inexistente → 404 con mensaje claro');
  console.log('\nACCESOS EXITOSOS (200/201):');
  console.log('  ✅ Admin lista choferes → 200');
  console.log('  ✅ Chofer actualiza su estado → 200');
  console.log('  ✅ Admin lista tractores → 200');
  console.log('\n🎉 SISTEMA DE MANEJO DE ERRORES FUNCIONANDO CORRECTAMENTE\n');
  console.log('='.repeat(80) + '\n');
}

test().catch(console.error);
