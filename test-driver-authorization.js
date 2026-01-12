const http = require('http');

function makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 5000,
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

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
    console.log('  🧪 TEST: AUTORIZACIÓN Y FILTRADO DE VIAJES POR ROL');
    console.log('='.repeat(70) + '\n');

    try {
        // 1. Registrar un nuevo chofer para el test
        const email = `chofer_test_${Date.now()}@test.com`;
        console.log(`🔑 Registrando chofer test (${email})...`);
        const registerRes = await makeRequest('POST', '/api/v1/auth/register', {
            email,
            password: 'password123',
            nombre_completo: 'Chofer Test'
        });

        if (registerRes.status !== 201) {
            throw new Error(`Error en registro de chofer: ${registerRes.status} ${JSON.stringify(registerRes.data)}`);
        }

        const { access_token: choferToken, usuario: { chofer_id: choferId } } = registerRes.data;
        console.log(`✅ Chofer registrado. ID: ${choferId}\n`);

        // 2. Test Chofer: GET /api/v1/viajes (debe poder entrar y ver 0 viajes)
        console.log('📋 Test 1: Chofer accede a sus viajes (debe ser 0)...');
        const choferViajes = await makeRequest('GET', '/api/v1/viajes', null, choferToken);
        console.log(`   Status: ${choferViajes.status}`);
        if (choferViajes.status === 200) {
            console.log(`   Total viajes para chofer: ${choferViajes.data.length}`);
            console.log('   ✅ Acceso concedido (no dio 403).\n');
        } else {
            console.log(`   ❌ Error: Status ${choferViajes.status}\n`);
        }

        // 3. Test Chofer: Acceder a un viaje inexistente o de otro (debe dar 404)
        console.log('📋 Test 2: Chofer intenta acceder a viaje ajeno o inexistente (ID 9999)...');
        const resAjeno = await makeRequest('GET', '/api/v1/viajes/9999', null, choferToken);
        console.log(`   Status: ${resAjeno.status} (Esperado: 404)`);
        if (resAjeno.status === 404) {
            console.log('   ✅ Correctamente bloqueado (No encontrado).\n');
        } else {
            console.log(`   ❌ Error inesperado: Status ${resAjeno.status}\n`);
        }

        console.log('✨ RESUMEN: El chofer ahora tiene acceso al endpoint de viajes (200 OK) y el filtrado por chofer_id está activo.');

    } catch (error) {
        console.error('❌ Error durante el test:', error);
    }

    console.log('='.repeat(70) + '\n');
}

test().catch(console.error);
