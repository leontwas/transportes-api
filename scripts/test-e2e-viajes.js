// test-e2e-viajes.js
// Prueba de flujo completo de creación de viajes con validaciones
const BASE_URL = 'http://localhost:3000/api/v1';

// Colores
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    yellow: '\x1b[33m'
};

// Datos base sin IDs
const testData = {
    chofer: {
        nombre_completo: 'Chofer Viajero',
        estado_chofer: 'activo'
    },
    tractor: {
        marca: 'Scania',
        modelo: 'R450',
        patente: 'VIAJE01',
        carga_max_tractor: 30000,
        estado_tractor: 'libre'
    },
    batea: {
        marca: 'Herrmann',
        modelo: 'Vulcano',
        patente: 'BTVIAJE',
        carga_max_batea: 30000,
        estado: 'vacio'
    },
    viaje: {
        origen: 'Mangrullo',
        destino: 'Añelo',
        fecha_salida: new Date().toISOString(),
        numero_remito: 'R-0001-00001111',
        toneladas_cargadas: 28.5
    }
};

// Variables para almacenar IDs generados
let createdIds = {
    chofer: null,
    tractor: null,
    batea: null,
    viaje: null
};

async function runStep(name, fn) {
    process.stdout.write(`${name}... `);
    try {
        const res = await fn();
        if (res && res.status >= 400) {
            const text = await res.text();
            console.log(`${colors.red}FALLÓ (${res.status}): ${text}${colors.reset}`);
            return null;
        }
        console.log(`${colors.green}OK${colors.reset}`);
        return res ? await res.json() : true;
    } catch (e) {
        console.log(`${colors.red}ERROR: ${e.message}${colors.reset}`);
        return null;
    }
}

async function cleanup() {
    console.log(colors.yellow + '\nIntentando limpiar recursos creados...' + colors.reset);
    // Limpieza suave (borra lo que creó este script)
    if (createdIds.viaje) await fetch(`${BASE_URL}/viajes/${createdIds.viaje}`, { method: 'DELETE' });

    // Desvincular antes de borrar
    if (createdIds.chofer) {
        await fetch(`${BASE_URL}/choferes/${createdIds.chofer}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tractor_id: null, batea_id: null })
        }).catch(() => { });
    }

    if (createdIds.chofer) await fetch(`${BASE_URL}/choferes/${createdIds.chofer}`, { method: 'DELETE' });
    if (createdIds.tractor) await fetch(`${BASE_URL}/tractores/${createdIds.tractor}`, { method: 'DELETE' });
    if (createdIds.batea) await fetch(`${BASE_URL}/bateas/${createdIds.batea}`, { method: 'DELETE' });
}

async function main() {
    console.log(`${colors.blue}=== Verificando Módulo de Viajes (IDs Numéricos) ===${colors.reset}\n`);

    try {
        // 1. Crear Recursos
        const choferRes = await runStep('Creando Chofer', () => fetch(`${BASE_URL}/choferes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData.chofer)
        }));
        if (choferRes) createdIds.chofer = choferRes.id_chofer;

        const tractorRes = await runStep('Creando Tractor', () => fetch(`${BASE_URL}/tractores`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData.tractor)
        }));
        if (tractorRes) createdIds.tractor = tractorRes.tractor_id;

        const bateaRes = await runStep('Creando Batea', () => fetch(`${BASE_URL}/bateas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData.batea)
        }));
        if (bateaRes) createdIds.batea = bateaRes.batea_id;

        if (!createdIds.chofer || !createdIds.tractor || !createdIds.batea) {
            throw new Error("Falló la creación de recursos base");
        }

        // 2. Asignar Recursos
        await runStep('Asignando Tractor a Chofer', () => fetch(`${BASE_URL}/choferes/${createdIds.chofer}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tractor_id: createdIds.tractor })
        }));

        await runStep('Asignando Batea a Chofer', () => fetch(`${BASE_URL}/choferes/${createdIds.chofer}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batea_id: createdIds.batea })
        }));

        // 3. Crear Viaje
        const viajeData = {
            ...testData.viaje,
            chofer_id: createdIds.chofer,
            tractor_id: createdIds.tractor,
            batea_id: createdIds.batea
        };

        const viajeCreado = await runStep('Creando Viaje (Mangrullo -> Añelo)', () => fetch(`${BASE_URL}/viajes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(viajeData)
        }));

        if (viajeCreado) {
            createdIds.viaje = viajeCreado.id_viaje;
            console.log(`\n${colors.yellow}Verificando Estados Post-Viaje:${colors.reset}`);

            // Verificar Tractor OCUPADO
            const tractor = await (await fetch(`${BASE_URL}/tractores/${createdIds.tractor}`)).json();
            if (tractor.estado_tractor === 'ocupado') {
                console.log(`Tractor Estado: ${colors.green}OCUPADO (Correcto)${colors.reset}`);
            } else {
                console.log(`Tractor Estado: ${colors.red}${tractor.estado_tractor} (Incorrecto)${colors.reset}`);
            }

            // Verificar Batea CARGADO
            const batea = await (await fetch(`${BASE_URL}/bateas/${createdIds.batea}`)).json();
            if (batea.estado === 'cargado') {
                console.log(`Batea Estado:   ${colors.green}CARGADO (Correcto)${colors.reset}`);
            } else {
                console.log(`Batea Estado:   ${colors.red}${batea.estado} (Incorrecto)${colors.reset}`);
            }
        }

        // 4. Intento de Segundo Viaje (Debe fallar)
        process.stdout.write('Intentando Segundo Viaje con recursos ocupados (Debe fallar)... ');
        const res2 = await fetch(`${BASE_URL}/viajes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(viajeData)
        });

        if (res2.status >= 400) {
            console.log(`${colors.green}OK (Bloqueado correctamente)${colors.reset}`);
        } else {
            console.log(`${colors.red}FALLÓ (Status ${res2.status}) - Debería haber fallado${colors.reset}`);
        }

    } catch (err) {
        console.error("Error crítico en prueba:", err);
    } finally {
        await cleanup();
        console.log(`\n${colors.blue}=== Fin de Pruebas ===${colors.reset}`);
    }
}

main();
