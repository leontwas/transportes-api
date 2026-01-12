const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'leon4475',
    database: process.env.DB_NAME || 'tractores_db',
});

async function findDasha() {
    try {
        await client.connect();
        console.log('--- Choferes ---');
        const choferes = await client.query(`SELECT id_chofer, nombre_completo, estado_chofer FROM choferes WHERE id_chofer = 11 OR nombre_completo ILIKE '%Dasha%'`);
        console.log(choferes.rows);

        console.log('\n--- Usuarios ---');
        const usuarios = await client.query(`SELECT email, chofer_id, rol FROM usuarios WHERE chofer_id = 11 OR email ILIKE '%dasha%'`);
        console.log(usuarios.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

findDasha();
