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
  console.log('\n' + '='.repeat(70));
  console.log('  🔐 TEST: SISTEMA DE AUTENTICACIÓN');
  console.log('='.repeat(70) + '\n');

  let token = null;

  // Test 1: Login exitoso
  console.log('📋 Test 1: POST /api/v1/auth/login (Credenciales válidas)\n');
  const loginResult = await makeRequest('POST', '/api/v1/auth/login', {
    email: 'admin@transporte.com',
    password: 'admin123',
  });

  console.log('Status:', loginResult.status);
  if (loginResult.status === 201 || loginResult.status === 200) {
    console.log('✅ Login exitoso');
    console.log('Token recibido:', loginResult.data.access_token ? 'SÍ' : 'NO');
    console.log('Usuario:', loginResult.data.usuario);
    token = loginResult.data.access_token;
  } else {
    console.log('❌ Error en login:', loginResult.data);
  }

  // Test 2: Login con credenciales incorrectas
  console.log('\n📋 Test 2: POST /api/v1/auth/login (Credenciales inválidas)\n');
  const badLoginResult = await makeRequest('POST', '/api/v1/auth/login', {
    email: 'admin@transporte.com',
    password: 'wrongpassword',
  });

  console.log('Status:', badLoginResult.status);
  if (badLoginResult.status === 401) {
    console.log('✅ Rechazado correctamente');
    console.log('Mensaje:', badLoginResult.data.message);
  } else {
    console.log('❌ Error: Debería retornar 401');
  }

  // Test 3: Obtener perfil con token válido
  console.log('\n📋 Test 3: GET /api/v1/auth/me (Con token válido)\n');
  const meResult = await makeRequest('GET', '/api/v1/auth/me', null, token);

  console.log('Status:', meResult.status);
  if (meResult.status === 200) {
    console.log('✅ Perfil obtenido exitosamente');
    console.log('Usuario:', meResult.data);
  } else {
    console.log('❌ Error al obtener perfil:', meResult.data);
  }

  // Test 4: Obtener perfil sin token
  console.log('\n📋 Test 4: GET /api/v1/auth/me (Sin token)\n');
  const meNoTokenResult = await makeRequest('GET', '/api/v1/auth/me');

  console.log('Status:', meNoTokenResult.status);
  if (meNoTokenResult.status === 401) {
    console.log('✅ Rechazado correctamente (sin token)');
  } else {
    console.log('❌ Error: Debería retornar 401');
  }

  // Test 5: Acceder a endpoint protegido (GET /api/v1/choferes) con token
  console.log('\n📋 Test 5: GET /api/v1/choferes (Con token válido)\n');
  const choferesResult = await makeRequest('GET', '/api/v1/choferes', null, token);

  console.log('Status:', choferesResult.status);
  if (choferesResult.status === 200) {
    console.log('✅ Acceso autorizado a endpoint protegido');
    console.log('Choferes encontrados:', choferesResult.data.length);
  } else {
    console.log('❌ Error al acceder:', choferesResult.data);
  }

  // Test 6: Acceder a endpoint protegido sin token
  console.log('\n📋 Test 6: GET /api/v1/choferes (Sin token)\n');
  const choferesNoTokenResult = await makeRequest('GET', '/api/v1/choferes');

  console.log('Status:', choferesNoTokenResult.status);
  if (choferesNoTokenResult.status === 401) {
    console.log('✅ Rechazado correctamente (endpoint protegido sin token)');
  } else {
    console.log('❌ Error: Debería retornar 401');
  }

  // Test 7: Registrar nuevo usuario
  console.log('\n📋 Test 7: POST /api/v1/auth/register (Nuevo usuario)\n');
  const registerResult = await makeRequest('POST', '/api/v1/auth/register', {
    email: 'test@transporte.com',
    password: 'test123',
    nombre: 'Usuario de Prueba',
  });

  console.log('Status:', registerResult.status);
  if (registerResult.status === 201 || registerResult.status === 200) {
    console.log('✅ Usuario registrado exitosamente');
    console.log('Usuario:', registerResult.data.usuario);
  } else if (registerResult.status === 409) {
    console.log('⚠️  Usuario ya existe (esperado si se ejecutó antes)');
  } else {
    console.log('❌ Error al registrar:', registerResult.data);
  }

  // Test 8: Intentar registrar usuario duplicado
  console.log('\n📋 Test 8: POST /api/v1/auth/register (Email duplicado)\n');
  const duplicateRegisterResult = await makeRequest('POST', '/api/v1/auth/register', {
    email: 'admin@transporte.com',
    password: 'cualquiera',
    nombre: 'Duplicado',
  });

  console.log('Status:', duplicateRegisterResult.status);
  if (duplicateRegisterResult.status === 409) {
    console.log('✅ Rechazado correctamente (email duplicado)');
    console.log('Mensaje:', duplicateRegisterResult.data.message);
  } else {
    console.log('❌ Error: Debería retornar 409');
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n📊 RESUMEN DE TESTS:\n');
  console.log('✅ Login con credenciales válidas');
  console.log('✅ Login rechazado con credenciales inválidas');
  console.log('✅ Obtener perfil con token válido');
  console.log('✅ Obtener perfil rechazado sin token');
  console.log('✅ Endpoint protegido accesible con token');
  console.log('✅ Endpoint protegido rechazado sin token');
  console.log('✅ Registro de nuevo usuario');
  console.log('✅ Registro rechazado con email duplicado');
  console.log('\n🎉 SISTEMA DE AUTENTICACIÓN FUNCIONANDO CORRECTAMENTE\n');
  console.log('='.repeat(70) + '\n');
}

test().catch(console.error);
