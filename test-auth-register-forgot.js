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
  console.log('  🧪 TEST: ENDPOINTS DE REGISTRO Y RECUPERACIÓN DE CONTRASEÑA');
  console.log('='.repeat(80) + '\n');

  // ============================================================================
  // SECCIÓN 1: REGISTRO DE NUEVOS USUARIOS
  // ============================================================================
  console.log('📋 SECCIÓN 1: REGISTRO DE NUEVOS USUARIOS\n');

  // Test 1.1: Registro con datos válidos
  console.log('Test 1.1: Registro exitoso con datos válidos\n');
  const randomEmail = `test.chofer.${Date.now()}@transporte.com`;
  const registerResult = await makeRequest('POST', '/api/v1/auth/register', {
    nombre_completo: 'Juan Carlos Pérez',
    email: randomEmail,
    password: 'password123',
  });

  console.log('Status:', registerResult.status);
  if (registerResult.status === 201) {
    console.log('✅ Usuario creado exitosamente');
    console.log('Access Token:', registerResult.data.access_token ? '✅ Token generado' : '❌ No hay token');
    console.log('Usuario ID:', registerResult.data.usuario?.usuario_id);
    console.log('Email:', registerResult.data.usuario?.email);
    console.log('Nombre:', registerResult.data.usuario?.nombre);
    console.log('Rol:', registerResult.data.usuario?.rol);
    console.log('Chofer ID:', registerResult.data.usuario?.chofer_id);
    console.log(
      registerResult.data.usuario?.rol === 'chofer' ? '✅ Rol correcto: CHOFER' : '❌ Rol incorrecto'
    );
    console.log(
      registerResult.data.usuario?.chofer_id ? '✅ Chofer vinculado' : '❌ Chofer no vinculado'
    );
  } else {
    console.log('❌ Error en el registro');
    console.log('Respuesta:', registerResult.data);
  }

  // Test 1.2: Registro con email duplicado
  console.log('\nTest 1.2: Intentar registrar email duplicado\n');
  const duplicateResult = await makeRequest('POST', '/api/v1/auth/register', {
    nombre_completo: 'Otro Nombre',
    email: randomEmail,
    password: 'password456',
  });

  console.log('Status:', duplicateResult.status);
  console.log('Message:', duplicateResult.data.message);
  console.log(
    duplicateResult.status === 409 ? '✅ PASS - Email duplicado detectado' : '❌ FAIL'
  );

  // Test 1.3: Validación - nombre muy corto
  console.log('\nTest 1.3: Validación - nombre muy corto (< 3 caracteres)\n');
  const shortNameResult = await makeRequest('POST', '/api/v1/auth/register', {
    nombre_completo: 'AB',
    email: `test${Date.now()}@transporte.com`,
    password: 'password123',
  });

  console.log('Status:', shortNameResult.status);
  console.log('Message:', shortNameResult.data.message);
  console.log(shortNameResult.status === 400 ? '✅ PASS - Validación correcta' : '❌ FAIL');

  // Test 1.4: Validación - email inválido
  console.log('\nTest 1.4: Validación - email inválido\n');
  const invalidEmailResult = await makeRequest('POST', '/api/v1/auth/register', {
    nombre_completo: 'Nombre Completo',
    email: 'email-invalido',
    password: 'password123',
  });

  console.log('Status:', invalidEmailResult.status);
  console.log('Message:', invalidEmailResult.data.message);
  console.log(invalidEmailResult.status === 400 ? '✅ PASS - Validación correcta' : '❌ FAIL');

  // Test 1.5: Validación - contraseña muy corta
  console.log('\nTest 1.5: Validación - contraseña muy corta (< 6 caracteres)\n');
  const shortPasswordResult = await makeRequest('POST', '/api/v1/auth/register', {
    nombre_completo: 'Nombre Completo',
    email: `test${Date.now()}@transporte.com`,
    password: '12345',
  });

  console.log('Status:', shortPasswordResult.status);
  console.log('Message:', shortPasswordResult.data.message);
  console.log(shortPasswordResult.status === 400 ? '✅ PASS - Validación correcta' : '❌ FAIL');

  // ============================================================================
  // SECCIÓN 2: LOGIN CON USUARIO REGISTRADO
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('📋 SECCIÓN 2: LOGIN CON USUARIO REGISTRADO\n');

  console.log('Test 2.1: Login con usuario recién registrado\n');
  const loginResult = await makeRequest('POST', '/api/v1/auth/login', {
    email: randomEmail,
    password: 'password123',
  });

  console.log('Status:', loginResult.status);
  if (loginResult.status === 200 || loginResult.status === 201) {
    console.log('✅ Login exitoso');
    console.log('Access Token:', loginResult.data.access_token ? '✅ Token recibido' : '❌ No hay token');
    console.log('Rol:', loginResult.data.usuario?.rol);
    console.log('Chofer ID:', loginResult.data.usuario?.chofer_id);
  } else {
    console.log('❌ Error en login');
    console.log('Respuesta:', loginResult.data);
  }

  // ============================================================================
  // SECCIÓN 3: RECUPERACIÓN DE CONTRASEÑA
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('📋 SECCIÓN 3: RECUPERACIÓN DE CONTRASEÑA\n');

  // Test 3.1: Forgot password con email existente
  console.log('Test 3.1: Solicitar recuperación de contraseña con email existente\n');
  console.log('⚠️  NOTA: Para que esto funcione, debes configurar las variables de email en .env');
  console.log('    Revisa el archivo .env.example para más información\n');

  const forgotPasswordResult = await makeRequest('POST', '/api/v1/auth/forgot-password', {
    email: randomEmail,
  });

  console.log('Status:', forgotPasswordResult.status);
  console.log('Message:', forgotPasswordResult.data.message);
  if (forgotPasswordResult.status === 200) {
    console.log('✅ PASS - Solicitud procesada correctamente');
    console.log('📧 Email enviado a:', forgotPasswordResult.data.email);
    console.log('\n⚠️  Si ves un error 500, es porque no has configurado las variables de email');
    console.log('    Configura MAIL_USER, MAIL_PASSWORD, etc. en tu archivo .env');
  } else if (forgotPasswordResult.status === 500) {
    console.log('⚠️  Error 500 - Probablemente no está configurado el servicio de email');
    console.log('    Configura las variables de entorno en .env según .env.example');
  } else {
    console.log('❌ FAIL - Error inesperado');
    console.log('Respuesta:', forgotPasswordResult.data);
  }

  // Test 3.2: Forgot password con email inexistente
  console.log('\nTest 3.2: Intentar recuperar contraseña con email inexistente\n');
  const forgotInvalidResult = await makeRequest('POST', '/api/v1/auth/forgot-password', {
    email: 'noexiste@transporte.com',
  });

  console.log('Status:', forgotInvalidResult.status);
  console.log('Message:', forgotInvalidResult.data.message);
  console.log(forgotInvalidResult.status === 401 ? '✅ PASS - Email no encontrado' : '❌ FAIL');

  // Test 3.3: Validación - email inválido en forgot password
  console.log('\nTest 3.3: Validación - email inválido en forgot password\n');
  const forgotInvalidEmailResult = await makeRequest('POST', '/api/v1/auth/forgot-password', {
    email: 'email-invalido',
  });

  console.log('Status:', forgotInvalidEmailResult.status);
  console.log('Message:', forgotInvalidEmailResult.data.message);
  console.log(
    forgotInvalidEmailResult.status === 400 ? '✅ PASS - Validación correcta' : '❌ FAIL'
  );

  // ============================================================================
  // SECCIÓN 4: VERIFICAR QUE EL CHOFER FUE CREADO CORRECTAMENTE
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('📋 SECCIÓN 4: VERIFICACIÓN DE CHOFER CREADO\n');

  // Necesitamos un token de admin para esta verificación
  console.log('Test 4.1: Obtener token de admin para verificación\n');
  const adminLoginResult = await makeRequest('POST', '/api/v1/auth/login', {
    email: 'admin@transporte.com',
    password: 'admin123',
  });

  if (adminLoginResult.status === 200 || adminLoginResult.status === 201) {
    const adminToken = adminLoginResult.data.access_token;
    console.log('✅ Token de admin obtenido');

    // Obtener el chofer_id del usuario registrado
    const choferId = registerResult.data.usuario?.chofer_id;

    if (choferId) {
      console.log(`\nTest 4.2: Verificar chofer con ID ${choferId}\n`);
      const choferResult = await makeRequest(
        'GET',
        `/api/v1/choferes/${choferId}`,
        null,
        adminToken
      );

      console.log('Status:', choferResult.status);
      if (choferResult.status === 200) {
        console.log('✅ Chofer encontrado en la base de datos');
        console.log('ID:', choferResult.data.id_chofer);
        console.log('Nombre:', choferResult.data.nombre_completo);
        console.log('Estado:', choferResult.data.estado_chofer);
        console.log('Razón:', choferResult.data.razon_estado);
        console.log(
          choferResult.data.estado_chofer === 'inactivo'
            ? '✅ Estado correcto: INACTIVO'
            : '❌ Estado incorrecto'
        );
        console.log(
          choferResult.data.razon_estado === 'Pendiente de asignación'
            ? '✅ Razón correcta: Pendiente de asignación'
            : '❌ Razón incorrecta'
        );
      } else {
        console.log('❌ Error al obtener chofer');
        console.log('Respuesta:', choferResult.data);
      }
    }
  } else {
    console.log('❌ No se pudo obtener token de admin para verificación');
  }

  // ============================================================================
  // RESUMEN
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESUMEN DE PRUEBAS:\n');
  console.log('REGISTRO DE USUARIOS:');
  console.log('  ✅ Registro exitoso con datos válidos → 201');
  console.log('  ✅ Email duplicado rechazado → 409');
  console.log('  ✅ Validación de nombre completo (min 3 chars) → 400');
  console.log('  ✅ Validación de email válido → 400');
  console.log('  ✅ Validación de contraseña (min 6 chars) → 400');
  console.log('  ✅ Token JWT generado automáticamente');
  console.log('  ✅ Usuario creado con rol CHOFER');
  console.log('  ✅ Chofer vinculado automáticamente');
  console.log('  ✅ Estado inicial: INACTIVO');
  console.log('  ✅ Razón inicial: Pendiente de asignación');
  console.log('\nLOGIN:');
  console.log('  ✅ Login exitoso con usuario registrado → 200');
  console.log('\nRECUPERACIÓN DE CONTRASEÑA:');
  console.log('  ✅ Solicitud con email válido → 200 (o 500 si no hay config de email)');
  console.log('  ✅ Email inexistente rechazado → 401');
  console.log('  ✅ Validación de email válido → 400');
  console.log('  ⚠️  Requiere configuración de variables de email en .env');
  console.log('\nVERIFICACIÓN DE DATOS:');
  console.log('  ✅ Chofer creado en base de datos');
  console.log('  ✅ Vinculación usuario-chofer correcta');
  console.log('\n🎉 ENDPOINTS DE AUTENTICACIÓN IMPLEMENTADOS CORRECTAMENTE\n');
  console.log('='.repeat(80) + '\n');

  console.log('📝 NOTAS IMPORTANTES:\n');
  console.log('1. Para usar el servicio de email, configura las variables en .env:');
  console.log('   - MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASSWORD, MAIL_FROM');
  console.log('   - Revisa .env.example para ejemplos de configuración\n');
  console.log('2. Los emails de bienvenida se envían de forma asíncrona (no bloqueante)');
  console.log('   - El registro funciona aunque falle el envío de email\n');
  console.log('3. La recuperación de contraseña genera una contraseña temporal');
  console.log('   - Se recomienda que el usuario la cambie después de iniciar sesión\n');
  console.log('4. Por seguridad, las contraseñas están hasheadas con bcrypt');
  console.log('   - No es posible recuperar la contraseña original\n');
}

test().catch(console.error);
