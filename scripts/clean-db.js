// clean-db.js
// Script para limpiar completamente la base de datos respetar el orden de integridad

const { Client } = require('pg');

// Configuración de conexión (ajustar según tu entorno local)
const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'tractores_db',
    password: 'leon4475',
    port: 5432,
});

async function clean() {
    try {
        await client.connect();
        console.log('Conectado a la base de datos...');

        // 1. Limpiar Viajes (Depende de todos)
        console.log('Eliminando viajes...');
        await client.query('DELETE FROM viajes');

        // 2. Romper Relaciones Circulares (Chofer <-> Tractor <-> Batea)
        console.log('Limpiando relaciones foráneas...');
        await client.query('UPDATE choferes SET tractor_id = NULL, batea_id = NULL');
        await client.query('UPDATE tractores SET chofer_id = NULL, batea_id = NULL');
        await client.query('UPDATE bateas SET chofer_id = NULL, tractor_id = NULL');

        // 3. Eliminar Entidades Base (Reiniciar secuencias es opcional pero recomendado)
        console.log('Eliminando choferes...');
        await client.query('TRUNCATE TABLE choferes RESTART IDENTITY CASCADE');

        console.log('Eliminando tractores...');
        await client.query('TRUNCATE TABLE tractores RESTART IDENTITY CASCADE');

        console.log('Eliminando bateas...');
        await client.query('TRUNCATE TABLE bateas RESTART IDENTITY CASCADE');

        console.log('Base de datos limpiada exitosamente.');
    } catch (err) {
        console.error('Error limpiando base de datos:', err);
    } finally {
        await client.end();
    }
}

clean();
