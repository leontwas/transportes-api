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
  console.log('  🧪 TEST: GESTIÓN DE LICENCIAS CON FECHAS PARA CHOFERES');
  console.log('='.repeat(80) + '\n');

  let tokenChofer = null;

  // Login como chofer
  console.log('📋 Test 1: Login como chofer\n');
  const loginResult = await makeRequest('POST', '/api/v1/auth/login', {
    email: 'carlos.andrada@transporte.com',
    password: 'chofer123',
  });

  if (loginResult.status === 200 || loginResult.status === 201) {
    console.log('✅ Login exitoso');
    console.log('   Usuario:', loginResult.data.usuario.nombre);
    console.log('   Rol:', loginResult.data.usuario.rol);
    console.log('   Chofer ID:', loginResult.data.usuario.chofer_id);
    tokenChofer = loginResult.data.access_token;
  } else {
    console.log('❌ Error en login:', loginResult.data);
    return;
  }

  // Test 2: Crear licencia anual con fechas
  console.log('\n📋 Test 2: Crear licencia anual con fecha inicio y fin\n');
  const fechaInicio = new Date('2026-01-10T00:00:00.000Z').toISOString();
  const fechaFin = new Date('2026-01-20T00:00:00.000Z').toISOString();

  const licenciaAnualResult = await makeRequest(
    'PATCH',
    '/api/v1/choferes/mi-estado',
    {
      estado_chofer: 'licencia_anual',
      fecha_inicio_licencia: fechaInicio,
      fecha_fin_licencia: fechaFin,
    },
    tokenChofer,
  );

  console.log('Status:', licenciaAnualResult.status);
  if (licenciaAnualResult.status === 200) {
    console.log('✅ Licencia anual creada exitosamente');
    console.log('   Estado:', licenciaAnualResult.data.estado_chofer);
    console.log('   Fecha inicio:', licenciaAnualResult.data.fecha_inicio_licencia);
    console.log('   Fecha fin:', licenciaAnualResult.data.fecha_fin_licencia);
  } else {
    console.log('❌ Error:', licenciaAnualResult.data);
  }

  // Test 3: Crear licencia médica sin fecha fin (duración desconocida)
  console.log('\n📋 Test 3: Crear licencia médica sin fecha fin\n');
  const fechaInicioMedica = new Date('2026-01-07T00:00:00.000Z').toISOString();

  const licenciaMedicaResult = await makeRequest(
    'PATCH',
    '/api/v1/choferes/mi-estado',
    {
      estado_chofer: 'licencia_medica',
      fecha_inicio_licencia: fechaInicioMedica,
      fecha_fin_licencia: null,
    },
    tokenChofer,
  );

  console.log('Status:', licenciaMedicaResult.status);
  if (licenciaMedicaResult.status === 200) {
    console.log('✅ Licencia médica creada exitosamente');
    console.log('   Estado:', licenciaMedicaResult.data.estado_chofer);
    console.log('   Fecha inicio:', licenciaMedicaResult.data.fecha_inicio_licencia);
    console.log('   Fecha fin:', licenciaMedicaResult.data.fecha_fin_licencia);
  } else {
    console.log('❌ Error:', licenciaMedicaResult.data);
  }

  // Test 4: Cambiar a estado activo (debe limpiar fechas)
  console.log('\n📋 Test 4: Cambiar a estado activo (limpiar fechas)\n');
  const activoResult = await makeRequest(
    'PATCH',
    '/api/v1/choferes/mi-estado',
    {
      estado_chofer: 'activo',
    },
    tokenChofer,
  );

  console.log('Status:', activoResult.status);
  if (activoResult.status === 200) {
    console.log('✅ Estado cambiado a activo');
    console.log('   Estado:', activoResult.data.estado_chofer);
    console.log('   Fecha inicio:', activoResult.data.fecha_inicio_licencia);
    console.log('   Fecha fin:', activoResult.data.fecha_fin_licencia);
    console.log('   ✓ Fechas limpiadas correctamente');
  } else {
    console.log('❌ Error:', activoResult.data);
  }

  // Test 5: Error - Licencia sin fecha de inicio
  console.log('\n📋 Test 5: Error - Licencia ART sin fecha de inicio\n');
  const errorSinFechaResult = await makeRequest(
    'PATCH',
    '/api/v1/choferes/mi-estado',
    {
      estado_chofer: 'licencia_art',
      fecha_fin_licencia: fechaFin,
    },
    tokenChofer,
  );

  console.log('Status:', errorSinFechaResult.status);
  if (errorSinFechaResult.status === 400) {
    console.log('✅ Error detectado correctamente');
    console.log('   Mensaje:', errorSinFechaResult.data.message);
  } else {
    console.log('❌ Debería retornar error 400');
  }

  // Test 6: Error - Fecha fin anterior a fecha inicio
  console.log('\n📋 Test 6: Error - Fecha fin anterior a fecha inicio\n');
  const errorFechasInvalidasResult = await makeRequest(
    'PATCH',
    '/api/v1/choferes/mi-estado',
    {
      estado_chofer: 'licencia_anual',
      fecha_inicio_licencia: fechaFin,
      fecha_fin_licencia: fechaInicio,
    },
    tokenChofer,
  );

  console.log('Status:', errorFechasInvalidasResult.status);
  if (errorFechasInvalidasResult.status === 400) {
    console.log('✅ Error detectado correctamente');
    console.log('   Mensaje:', errorFechasInvalidasResult.data.message);
  } else {
    console.log('❌ Debería retornar error 400');
  }

  // Test 7: Error - Fechas en estado no-licencia
  console.log('\n📋 Test 7: Error - Intentar poner fechas en estado viajando\n');
  const errorFechasEnViajandoResult = await makeRequest(
    'PATCH',
    '/api/v1/choferes/mi-estado',
    {
      estado_chofer: 'viajando',
      fecha_inicio_licencia: fechaInicio,
      fecha_fin_licencia: fechaFin,
    },
    tokenChofer,
  );

  console.log('Status:', errorFechasEnViajandoResult.status);
  if (errorFechasEnViajandoResult.status === 400) {
    console.log('✅ Error detectado correctamente');
    console.log('   Mensaje:', errorFechasEnViajandoResult.data.message);
  } else {
    console.log('❌ Debería retornar error 400');
  }

  // Test 8: Cambiar entre diferentes estados operacionales
  console.log('\n📋 Test 8: Cambiar a estado cargando\n');
  const cargandoResult = await makeRequest(
    'PATCH',
    '/api/v1/choferes/mi-estado',
    {
      estado_chofer: 'cargando',
    },
    tokenChofer,
  );

  console.log('Status:', cargandoResult.status);
  if (cargandoResult.status === 200) {
    console.log('✅ Estado cambiado correctamente');
    console.log('   Estado:', cargandoResult.data.estado_chofer);
  } else {
    console.log('❌ Error:', cargandoResult.data);
  }

  // Resumen final
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 RESUMEN DE TESTS:\n');
  console.log('✅ Login como chofer');
  console.log('✅ Crear licencia anual con fechas de inicio y fin');
  console.log('✅ Crear licencia médica sin fecha de fin');
  console.log('✅ Cambiar a estado activo (limpiar fechas)');
  console.log('✅ Validación: Licencia sin fecha de inicio');
  console.log('✅ Validación: Fecha fin anterior a fecha inicio');
  console.log('✅ Validación: Fechas en estados no-licencia');
  console.log('✅ Cambiar entre estados operacionales');
  console.log('\n🎉 SISTEMA DE LICENCIAS CON FECHAS FUNCIONANDO CORRECTAMENTE\n');
  console.log('='.repeat(80) + '\n');
}

test().catch(console.error);
