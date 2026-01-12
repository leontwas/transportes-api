const { Client } = require('pg');

// Configuración de patentes y datos
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function generatePatente(index, suffix = 'AA') {
    // Genera patentes tipo AA 000 XX
    // Usamos el index para el número (0-999)
    // El suffix para las letras finales
    const numberPart = (index % 1000).toString().padStart(3, '0');
    const prefix = 'AA'; // Simplificado para seed: Siempre AA al inicio
    return `${prefix}${numberPart}${suffix}`;
}

async function seedDatabase() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'leon4475',
        database: 'tractores_db',
    });

    try {
        await client.connect();
        console.log('Conectado a la base de datos PostgreSQL');

        // Datos base para combinaciones
        const marcasTractor = ['Volvo', 'Scania', 'Mercedes-Benz', 'MAN', 'Iveco'];
        const modelosTractor = ['FH16', 'R580', 'Actros', 'TGX', 'Stralis'];

        const marcasBatea = ['Fruehauf', 'Randon', 'Great Dane', 'Wabash', 'Schmitz'];
        const modelosBatea = ['F350', 'R440', 'GD500', 'W600', 'SCB-S3B'];

        // Capacidades "Emparejadas" (Tractor, Batea)
        // Se compran juntos -> Misma capacidad base
        const capacidades = [30, 35, 38, 40, 42, 45];

        console.log('\nGenerando datos consistentes...');

        // Generar 50 pares
        const TOTAL_PAIRS = 50;

        for (let i = 0; i < TOTAL_PAIRS; i++) {
            const capacidad = capacidades[i % capacidades.length];
            const marcaT = marcasTractor[i % marcasTractor.length];
            const modeloT = modelosTractor[i % modelosTractor.length];
            const marcaB = marcasBatea[i % marcasBatea.length];
            const modeloB = modelosBatea[i % modelosBatea.length];

            // Patentes: AA{i}TR para tractor, AA{i}BA para batea
            // Ajustamos formato AA 123 TR
            const patenteTractor = generatePatente(i + 1, 'TR');
            const patenteBatea = generatePatente(i + 1, 'BA');

            // Insertar Tractor
            await client.query(
                `INSERT INTO tractores (marca, modelo, patente, estado_tractor, carga_max_tractor, activo, creado_en, actualizado_en)
             VALUES ($1, $2, $3, 'libre', $4, true, NOW(), NOW())`,
                [marcaT, modeloT, patenteTractor, capacidad]
            );

            // Insertar Batea (Misma capacidad o compatible)
            await client.query(
                `INSERT INTO bateas (marca, modelo, patente, estado, carga_max_batea, activo, creado_en, actualizado_en)
             VALUES ($1, $2, $3, 'vacio', $4, true, NOW(), NOW())`,
                [marcaB, modeloB, patenteBatea, capacidad]
            );
        }

        console.log(`\n✅ Se han insertado/verificado ${TOTAL_PAIRS} pares de Tractores y Bateas.`);
        console.log('   - Formato Patente Tractor: AA###TR (Ej: AA001TR)');
        console.log('   - Formato Patente Batea:   AA###BA (Ej: AA001BA)');
        console.log('   - Capacidades sincronizadas por par de compra.');

    } catch (error) {
        console.error('❌ Error al insertar datos:', error.message);
        throw error;
    } finally {
        await client.end();
    }
}

seedDatabase()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        process.exit(1);
    });
