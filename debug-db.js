const { Client } = require('pg');

async function testConnection() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'leon4475',
        database: 'tractores_db',
        ssl: false,
    });

    try {
        console.log('Connecting to PostgreSQL...');
        await client.connect();
        console.log('✅ Connected successfully!');

        const res = await client.query('SELECT NOW()');
        console.log('Server time:', res.rows[0].now);

        const enums = await client.query(`
      SELECT n.nspname AS schema, t.typname AS type, e.enumlabel AS value 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      JOIN pg_namespace n ON n.oid = t.typnamespace 
      WHERE t.typname = 'choferes_estado_chofer_enum';
    `);
        console.log('Current enums in DB:', enums.rows.map(r => r.value));

        await client.end();
    } catch (err) {
        console.error('❌ Connection error:', err.message);
        console.error('Stack:', err.stack);
    }
}

testConnection();
