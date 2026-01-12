// scripts/test-load-validation.js
const BASE_URL = 'http://localhost:3000/api/v1';
const colors = { green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', reset: '\x1b[0m' };

const timestamp = Date.now() % 10000;
const data = {
    chofer: { nombre_completo: `Chofer Carga ${timestamp}`, estado_chofer: 'activo' },
    // Tractor 40t, Batea 30t -> Límite = 30t
    tractor: { marca: 'Test', modelo: 'T40', patente: `TT${timestamp}TR`, carga_max_tractor: 40, estado_tractor: 'libre' },
    batea: { marca: 'Test', modelo: 'B30', patente: `BB${timestamp}BA`, carga_max_batea: 30, estado: 'vacio' }
};

let ids = { chofer: null, tractor: null, batea: null, viaje: null };

async function cleanup() {
    console.log('Limpiando datos de prueba...');
    const deleteIfId = async (endpoint, id) => {
        if (id) await fetch(`${endpoint}/${id}`, { method: 'DELETE' }).catch(() => { });
    };

    if (ids.chofer) {
        await fetch(`${BASE_URL}/choferes/${ids.chofer}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tractor_id: null, batea_id: null })
        }).catch(() => { });
    }

    await deleteIfId(`${BASE_URL}/viajes`, ids.viaje);
    await deleteIfId(`${BASE_URL}/choferes`, ids.chofer);
    await deleteIfId(`${BASE_URL}/tractores`, ids.tractor);
    await deleteIfId(`${BASE_URL}/bateas`, ids.batea);
}

async function runStep(name, fn, expectSuccess = true) {
    process.stdout.write(`${name}... `);
    try {
        const res = await fn();
        let text = "";
        try { text = await res.text(); } catch (e) { }

        let json = null;
        try { json = JSON.parse(text); } catch { }

        const success = res.ok;
        if (expectSuccess === success) {
            console.log(`${colors.green}OK ${!success ? `(Bloqueado: ${json?.message || text})` : ''}${colors.reset}`);
            return json || true;
        } else {
            console.log(`${colors.red}FAIL (Status ${res.status}): ${text}${colors.reset}`);
            return null;
        }
    } catch (e) {
        console.log(`${colors.red}ERROR: ${e.message}${colors.reset}`);
        return null;
    }
}

async function main() {
    console.log(`${colors.yellow}=== Verificando Validación de Carga Máxima ===${colors.reset}\n`);

    try {
        // Usa runStep para ver el error si falla
        const resC = await runStep('Crear Chofer', () => fetch(`${BASE_URL}/choferes`, { method: 'POST', body: JSON.stringify(data.chofer), headers: { 'Content-Type': 'application/json' } }));
        if (resC?.id_chofer) ids.chofer = resC.id_chofer;

        const resT = await runStep('Crear Tractor', () => fetch(`${BASE_URL}/tractores`, { method: 'POST', body: JSON.stringify(data.tractor), headers: { 'Content-Type': 'application/json' } }));
        if (resT?.tractor_id) ids.tractor = resT.tractor_id;

        const resB = await runStep('Crear Batea', () => fetch(`${BASE_URL}/bateas`, { method: 'POST', body: JSON.stringify(data.batea), headers: { 'Content-Type': 'application/json' } }));
        if (resB?.batea_id) ids.batea = resB.batea_id;

        if (!ids.chofer || !ids.tractor || !ids.batea) throw new Error("Fallo al crear recursos base");

        // 2. Asignar
        await fetch(`${BASE_URL}/tractores/${ids.tractor}/chofer/${ids.chofer}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' } });
        await fetch(`${BASE_URL}/bateas/${ids.batea}/chofer/${ids.chofer}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' } });

        // 3. Intento Exitoso (Carga 29t <= 30t)
        const viajeOk = {
            chofer_id: ids.chofer,
            tractor_id: ids.tractor,
            batea_id: ids.batea,
            origen: 'A', destino: 'B', fecha_salida: new Date(),
            toneladas_cargadas: 29
        };

        const resViaje = await runStep('Crear Viaje OK (29t)', () => fetch(`${BASE_URL}/viajes`, {
            method: 'POST',
            body: JSON.stringify(viajeOk),
            headers: { 'Content-Type': 'application/json' }
        }), true);

        if (resViaje?.id_viaje) {
            ids.viaje = resViaje.id_viaje;
            await fetch(`${BASE_URL}/viajes/${ids.viaje}`, { method: 'DELETE' });
            ids.viaje = null;
        } else {
            throw new Error("No se pudo crear el viaje válido");
        }

        // 4. Intento Fallido (Carga 35t > 30t)
        const viajeFail = { ...viajeOk, toneladas_cargadas: 35 };

        await runStep('Crear Viaje Expreso (35t)', () => fetch(`${BASE_URL}/viajes`, {
            method: 'POST',
            body: JSON.stringify(viajeFail),
            headers: { 'Content-Type': 'application/json' }
        }), false); // Esperamos fallo

    } catch (e) {
        console.error("Error crítico:", e.message);
    } finally {
        await cleanup();
        console.log(`\n${colors.blue}=== Fin de Pruebas ===${colors.reset}`);
    }
}

main();
