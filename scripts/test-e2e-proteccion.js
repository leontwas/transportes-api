// test-e2e-proteccion.js
// Prueba de regla de negocio: No se puede reasignar si el dueño está ACTIVO
const BASE_URL = 'http://localhost:3000/api/v1';
const colors = { green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', reset: '\x1b[0m' };

// Datos sin IDs
const testData = {
    choferA: { nombre_completo: 'Chofer Activo A', estado_chofer: 'activo' },
    choferB: { nombre_completo: 'Chofer Nuevo B', estado_chofer: 'activo' },
    tractor: { marca: 'Test', modelo: 'Test', patente: 'REGLATR1', carga_max_tractor: 10000, estado_tractor: 'libre' }
};

let ids = {
    choferA: null,
    choferB: null,
    tractor: null
};

async function cleanup() {
    console.log('Limpiando datos de prueba...');
    const desvincular = async (id) => {
        if (!id) return;
        await fetch(`${BASE_URL}/choferes/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tractor_id: null, batea_id: null })
        }).catch(() => { });
    };

    await desvincular(ids.choferA);
    await desvincular(ids.choferB);

    if (ids.choferA) await fetch(`${BASE_URL}/choferes/${ids.choferA}`, { method: 'DELETE' });
    if (ids.choferB) await fetch(`${BASE_URL}/choferes/${ids.choferB}`, { method: 'DELETE' });
    if (ids.tractor) await fetch(`${BASE_URL}/tractores/${ids.tractor}`, { method: 'DELETE' });
}

async function runStep(name, fn, expectSuccess = true) {
    process.stdout.write(`${name}... `);
    try {
        const res = await fn();
        let text = "";
        try { text = await res.text(); } catch (e) { }

        const success = res.ok;

        if (expectSuccess === success) {
            console.log(`${colors.green}OK ${!success ? `(Bloqueado: ${JSON.parse(text).message})` : ''}${colors.reset}`);
            return true;
        } else {
            console.log(`${colors.red}FAIL (Status ${res.status}): ${text}${colors.reset}`);
            return false;
        }
    } catch (e) {
        console.log(`${colors.red}ERROR: ${e.message}${colors.reset}`);
        return false;
    }
}

async function main() {
    console.log(`${colors.yellow}=== Verificando Regla de Protección de Recursos (IDs Numéricos) ===${colors.reset}\n`);

    try {
        // 1. Crear Entidades
        const resA = await fetch(`${BASE_URL}/choferes`, { method: 'POST', body: JSON.stringify(testData.choferA), headers: { 'Content-Type': 'application/json' } });
        if (resA.ok) ids.choferA = (await resA.json()).id_chofer;

        const resB = await fetch(`${BASE_URL}/choferes`, { method: 'POST', body: JSON.stringify(testData.choferB), headers: { 'Content-Type': 'application/json' } });
        if (resB.ok) ids.choferB = (await resB.json()).id_chofer;

        const resT = await fetch(`${BASE_URL}/tractores`, { method: 'POST', body: JSON.stringify(testData.tractor), headers: { 'Content-Type': 'application/json' } });
        if (resT.ok) ids.tractor = (await resT.json()).tractor_id;

        if (!ids.choferA || !ids.choferB || !ids.tractor) {
            throw new Error("Falló la creación inicial de recursos");
        }

        // 2. Asignar Tractor a Chofer A (Activo)
        console.log('Asignando Tractor a Chofer A...');
        await fetch(`${BASE_URL}/tractores/${ids.tractor}/chofer/${ids.choferA}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
        });

        // 3. INTENTO 1: Asignar Tractor a Chofer B (Debe FALLAR porque A es Activo)
        await runStep(
            'Intento reasignar Tractor de A(Activo) a B',
            () => fetch(`${BASE_URL}/tractores/${ids.tractor}/chofer/${ids.choferB}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' }
            }),
            false // Esperamos fallo
        );

        // 4. Cambiar estado Chofer A a LICENCIA_MEDICA
        console.log('Cambiando Chofer A a Licencia...');
        await runStep('Cambiar Estado A', () => fetch(`${BASE_URL}/choferes/${ids.choferA}/estado`, {
            method: 'PATCH',
            body: JSON.stringify({ estado_chofer: 'lic_medica' }),
            headers: { 'Content-Type': 'application/json' }
        }));

        // Debug: Verificar estado intermedio
        const choferStatus = await (await fetch(`${BASE_URL}/choferes/${ids.choferA}`)).json();
        console.log(`DEBUG: Estado actual de Chofer A: ${choferStatus.estado_chofer}`);

        // 5. INTENTO 2: Asignar Tractor a Chofer B (Debe FUNCIONAR porque A es Licencia)
        await runStep(
            'Intento reasignar Tractor de A(Licencia) a B',
            () => fetch(`${BASE_URL}/tractores/${ids.tractor}/chofer/${ids.choferB}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' }
            }),
            true // Esperamos éxito
        );

    } catch (e) {
        console.error("Error crítico:", e);
    } finally {
        await cleanup();
        console.log(`\n${colors.blue}=== Fin de Pruebas ===${colors.reset}`);
    }
}

main();
