require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';

// Credenciales de prueba (asume que hay un admin y un chofer en la DB)
const adminCredentials = {
    email: 'admin@transporte.com',
    password: 'admin123',
};

let adminToken = '';
let testChoferId = null;
let testViajeId = null;

// Helper para hacer requests autenticados
async function authRequest(method, url, data = null, token = adminToken) {
    try {
        const config = {
            method,
            url: `${API_URL}${url}`,
            headers: { Authorization: `Bearer ${token}` },
        };
        if (data) config.data = data;
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error(`Error en ${method} ${url}:`, error.response?.data || error.message);
        throw error;
    }
}

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testRestHoursAccumulation() {
    try {
        console.log('🧪 TEST: Acumulación de Horas de Descanso\n');

        // 1. Login como admin
        console.log('[1/12] Login como administrador...');
        const loginResponse = await axios.post(`${API_URL}/auth/login`, adminCredentials);
        adminToken = loginResponse.data.access_token;
        console.log('✓ Login exitoso\n');

        // 2. Obtener un chofer disponible
        console.log('[2/12] Buscando chofer disponible...');
        const choferes = await authRequest('GET', '/choferes?estado=disponible');
        if (!choferes || choferes.length === 0) {
            throw new Error('No hay choferes disponibles. Ejecuta seed-db.js primero.');
        }
        const chofer = choferes[0];
        testChoferId = chofer.id_chofer;
        console.log(`✓ Chofer encontrado: ${chofer.nombre_completo} (ID: ${testChoferId})\n`);

        // Verificar que tenga tractor y batea asignados
        if (!chofer.tractor_id || !chofer.batea_id) {
            throw new Error('El chofer debe tener tractor y batea asignados');
        }

        // 3. Crear un viaje
        console.log('[3/12] Creando viaje...');
        const nuevoViaje = await authRequest('POST', '/viajes', {
            chofer_id: testChoferId,
            tractor_id: chofer.tractor_id,
            batea_id: chofer.batea_id,
            origen: 'Mangrullo',
            destino: 'Buenos Aires',
            fecha_salida: new Date(),
            numero_remito: 'TEST-001',
            toneladas_cargadas: 20,
        });
        testViajeId = nuevoViaje.id_viaje;
        console.log(`✓ Viaje creado: ID ${testViajeId}`);
        console.log(`  horas_descansadas iniciales: ${nuevoViaje.horas_descansadas}\n`);

        // 4. Cambiar estado a CARGANDO
        console.log('[4/12] Cambiando estado a CARGANDO...');
        await authRequest('PATCH', `/choferes/${testChoferId}/estado`, {
            estado_chofer: 'cargando',
            confirmado: true,
        });
        console.log('✓ Estado: CARGANDO\n');

        // 5. Cambiar estado a VIAJANDO
        console.log('[5/12] Cambiando estado a VIAJANDO...');
        await authRequest('PATCH', `/choferes/${testChoferId}/estado`, {
            estado_chofer: 'viajando',
            confirmado: true,
        });
        console.log('✓ Estado: VIAJANDO\n');

        // ========== PRIMER PERÍODO DE DESCANSO ==========
        console.log('--- PRIMER PERÍODO DE DESCANSO ---\n');

        // 6. Iniciar primer descanso
        console.log('[6/12] Iniciando primer período de descanso...');
        await authRequest('PATCH', `/choferes/${testChoferId}/estado`, {
            estado_chofer: 'descansando',
            confirmado: true,
        });
        console.log('✓ Estado: DESCANSANDO (período 1 iniciado)');

        // VERIFICACIÓN DE ESTADO SINCRONIZADO
        console.log('\n--- Verificando sincronización de estado (LIVE) ---');
        let tempViaje = await authRequest('GET', `/viajes/${testViajeId}`);
        console.log(`Viaje ID ${testViajeId} estado: ${tempViaje.estado_viaje}`);
        console.log(`Chofer estado reportado en viaje: ${tempViaje.chofer?.estado_chofer}`);

        if (tempViaje.estado_viaje === 'descansando') {
            console.log('✅ Sincronización exitosa: El viaje ahora dice DESCANSANDO');
        } else {
            console.log('❌ OJO: El viaje NO se sincronizó a DESCANSANDO');
        }

        console.log('  Esperando 20 segundos...\n');
        await sleep(20000);

        // 7. Finalizar primer descanso
        console.log('[7/12] Finalizando primer período de descanso...');
        await authRequest('PATCH', `/choferes/${testChoferId}/estado`, {
            estado_chofer: 'viajando',
            confirmado: true,
        });
        console.log('✓ Estado: VIAJANDO (período 1 finalizado)');

        let viaje = await authRequest('GET', `/viajes/${testViajeId}`);
        console.log(`  horas_descansadas después del período 1: ${viaje.horas_descansadas}\n`);

        // ========== SEGUNDO PERÍODO DE DESCANSO ==========
        console.log('--- SEGUNDO PERÍODO DE DESCANSO ---\n');

        // 8. Iniciar segundo descanso
        console.log('[8/12] Iniciando segundo período de descanso...');
        await authRequest('PATCH', `/choferes/${testChoferId}/estado`, {
            estado_chofer: 'descansando',
            confirmado: true,
        });
        console.log('✓ Estado: DESCANSANDO (período 2 iniciado)');
        console.log('  Esperando 20 segundos...\n');
        await sleep(20000);

        // 9. Finalizar segundo descanso
        console.log('[9/12] Finalizando segundo período de descanso...');
        await authRequest('PATCH', `/choferes/${testChoferId}/estado`, {
            estado_chofer: 'viajando',
            confirmado: true,
        });
        console.log('✓ Estado: VIAJANDO (período 2 finalizado)');

        viaje = await authRequest('GET', `/viajes/${testViajeId}`);
        console.log(`  horas_descansadas después del período 2: ${viaje.horas_descansadas}\n`);

        // 10. Cambiar a DESCARGANDO
        console.log('[10/12] Cambiando estado a DESCARGANDO...');
        await authRequest('PATCH', `/choferes/${testChoferId}/estado`, {
            estado_chofer: 'descargando',
            confirmado: true,
        });
        console.log('✓ Estado: DESCARGANDO\n');

        // 11. Finalizar entrega
        console.log('[11/12] Finalizando entrega...');
        await authRequest('PATCH', `/choferes/${testChoferId}/estado`, {
            estado_chofer: 'entrega_finalizada',
            toneladas_descargadas: 20,
            confirmado: true,
        });
        console.log('✓ Estado: ENTREGA_FINALIZADA → DISPONIBLE\n');

        // 12. Verificación final
        console.log('[12/12] Verificación final...');
        viaje = await authRequest('GET', `/viajes/${testViajeId}`);

        console.log('\n=== RESULTADOS ===');
        console.log(`Viaje ID: ${viaje.id_viaje}`);
        console.log(`Estado: ${viaje.estado_viaje}`);
        console.log(`Horas descansadas acumuladas: ${viaje.horas_descansadas || 0} horas`);
        console.log(`Fecha descarga: ${viaje.fecha_descarga}`);
        console.log(`Toneladas descargadas: ${viaje.toneladas_descargadas}`);

        // Verificar que las horas sean > 0
        if (viaje.horas_descansadas > 0) {
            console.log('\n✅ TEST EXITOSO: Las horas de descanso fueron acumuladas correctamente');
        } else {
            console.log('\n❌ TEST FALLIDO: Las horas de descanso no fueron acumuladas');
        }

        // Obtener todos los viajes para verificar que el campo está presente
        console.log('\n--- Verificando endpoint GET /viajes ---');
        const todosViajes = await authRequest('GET', '/viajes');
        const viajeTest = todosViajes.find(v => v.id_viaje === testViajeId);
        if (viajeTest && 'horas_descansadas' in viajeTest) {
            console.log('✓ El campo horas_descansadas está presente en la respuesta de /viajes');
        } else {
            console.log('⚠️ El campo horas_descansadas NO está presente en la respuesta de /viajes');
        }

    } catch (error) {
        console.error('\n❌ ERROR EN EL TEST:', error.message);
        if (error.response?.data) {
            console.error('Detalles:', error.response.data);
        }
        process.exit(1);
    }
}

testRestHoursAccumulation();
