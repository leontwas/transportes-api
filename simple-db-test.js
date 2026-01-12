const { Client } = require('pg');

async function simpleTest() {
    console.log('Testing PostgreSQL connection with pg package...');
    console.log('Host: localhost');
    console.log('Port: 5432');
    console.log('User: postgres');
    console.log('Database: tractores_db');

    const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'leon4475',
        database: 'postgres', // Connect to default database first
        ssl: false,
        connect_timeout: 10,
    });

    try {
        console.log('\n1. Attempting to connect to default postgres database...');
        await client.connect();
        console.log('✅ Connected successfully to postgres database!');

        const res = await client.query('SELECT current_database(), version()');
        console.log('Current database:', res.rows[0].current_database);
        console.log('PostgreSQL version:', res.rows[0].version);

        await client.end();
        console.log('\n✅ Test passed! PostgreSQL is accessible.');

    } catch (err) {
        console.error('\n❌ Connection failed:', err.message);
        console.error('Error code:', err.code);
        console.error('Full error:', err);
    }
}

simpleTest();
