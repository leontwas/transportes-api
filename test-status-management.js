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
            timeout: 10000,
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => (responseData += chunk));
            res.on('end', () => {
                try {
                    const json = JSON.parse(responseData);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data: responseData });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function runTests() {
    console.log('🧪 Iniciando Tests de Gestión de Estados de Chofer\n');

    let token = null;
    // Login
    const login = await makeRequest('POST', '/api/v1/auth/login', {
        email: 'carlos.andrada@transporte.com',
        password: 'chofer123',
    });
    if (login.status !== 201 && login.status !== 200) {
        console.error('❌ Login fallido');
        return;
    }
    token = login.data.access_token;
    const choferId = login.data.usuario.chofer_id;

    console.log(`✅ Logueado como chofer ${choferId}`);

    // 1. Resetear a LIBRE_O_DISPONIBLE (excepción permitida)
    console.log('\n📋 Test 1: Resetear a libre_o_disponible...');
    const reset = await makeRequest('PATCH', '/api/v1/choferes/mi-estado', {
        estado_chofer: 'libre_o_disponible',
        confirmado: true
    }, token);
    console.log(`Status: ${reset.status}, Estado: ${reset.data.estado_chofer}`);

    // 2. Transición inválida (Libre -> Viajando) sin confirmar
    console.log('\n📋 Test 2: Transición inválida (libre -> viajando) sin confirmar...');
    const invalid = await makeRequest('PATCH', '/api/v1/choferes/mi-estado', {
        estado_chofer: 'viajando'
    }, token);
    if (invalid.data.requiereConfirmacion) {
        console.log('✅ Recibió advertencia correctamente');
        console.log(`Mensaje: ${invalid.data.mensaje}`);
    } else {
        console.log('❌ No recibió advertencia');
    }

    // 3. Transición válida (Libre -> Cargando)
    console.log('\n📋 Test 3: Transición válida (libre -> cargando)...');
    const step1 = await makeRequest('PATCH', '/api/v1/choferes/mi-estado', {
        estado_chofer: 'cargando'
    }, token);
    console.log(`Status: ${step1.status}, Estado: ${step1.data.estado_chofer}`);

    // 4. Transición válida (Cargando -> Viajando)
    console.log('\n📋 Test 4: Transición válida (cargando -> viajando)...');
    const step2 = await makeRequest('PATCH', '/api/v1/choferes/mi-estado', {
        estado_chofer: 'viajando'
    }, token);
    console.log(`Status: ${step2.status}, Estado: ${step2.data.estado_chofer}`);

    // 5. Iniciar Descanso
    console.log('\n📋 Test 5: Iniciar Descanso...');
    const step3 = await makeRequest('PATCH', '/api/v1/choferes/mi-estado', {
        estado_chofer: 'descansando'
    }, token);
    console.log(`Status: ${step3.status}, Estado: ${step3.data.estado_chofer}`);
    console.log(`Inicio descanso: ${step3.data.ultimo_inicio_descanso}`);

    // 6. Terminar Descanso (Volver a Viajando)
    console.log('\n📋 Test 6: Terminar Descanso...');
    const step4 = await makeRequest('PATCH', '/api/v1/choferes/mi-estado', {
        estado_chofer: 'viajando'
    }, token);
    console.log(`Status: ${step4.status}, Estado: ${step4.data.estado_chofer}`);
    console.log(`Fin descanso: ${step4.data.ultimo_fin_descanso}`);

    // 7. Descargar con toneladas
    console.log('\n📋 Test 7: Descargar con toneladas...');
    const step5 = await makeRequest('PATCH', '/api/v1/choferes/mi-estado', {
        estado_chofer: 'descargando',
        toneladas_descargadas: 28.5
    }, token);
    console.log(`Status: ${step5.status}, Estado: ${step5.data.estado_chofer}`);

    // 8. Verificar viaje actualizado
    console.log('\n📋 Test 8: Verificar toneladas en viaje...');
    const viajes = await makeRequest('GET', '/api/v1/viajes', null, token);
    // El último viaje debería tener 28.5 toneladas descargadas
    const ultimoViaje = viajes.data[0];
    if (ultimoViaje && ultimoViaje.toneladas_descargadas === 28.5) {
        console.log(`✅ Viaje ID ${ultimoViaje.id_viaje} tiene 28.5 toneladas descargadas`);
    } else {
        console.log('❌ No se actualizaron las toneladas en el viaje', ultimoViaje?.toneladas_descargadas);
    }

    // 9. Volver a Libre
    console.log('\n📋 Test 9: Volver a libre_o_disponible...');
    const step6 = await makeRequest('PATCH', '/api/v1/choferes/mi-estado', {
        estado_chofer: 'libre_o_disponible'
    }, token);
    console.log(`Status: ${step6.status}, Estado: ${step6.data.estado_chofer}`);

    console.log('\n🎉 Todos los tests completados!');
}

runTests();
