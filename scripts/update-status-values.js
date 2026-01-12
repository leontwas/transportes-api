const { Client } = require('pg');

async function migrateStatuses() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'leon4475',
        database: 'tractores_db',
    });

    try {
        await client.connect();
        console.log('Connected to PostgreSQL');

        // 1. Update existing 'activo' to 'libre_o_disponible'
        const res = await client.query(`
      UPDATE choferes 
      SET estado_chofer = 'libre_o_disponible' 
      WHERE estado_chofer = 'activo'
    `);

        console.log(`✅ Updated ${res.rowCount} choferes from 'activo' to 'libre_o_disponible'`);

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        await client.end();
    }
}

migrateStatuses();
