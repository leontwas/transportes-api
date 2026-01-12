require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'leon4475',
    database: process.env.DB_NAME || 'tractores_db',
});

async function cleanOldTriggers() {
    try {
        await client.connect();
        console.log('✓ Conectado a la base de datos');

        console.log('\n[1/3] Listando triggers en tabla viajes...');
        const triggers = await client.query(`
            SELECT trigger_name 
            FROM information_schema.triggers 
            WHERE event_object_table = 'viajes';
        `);
        console.log(`  Triggers encontrados: ${triggers.rows.map(r => r.trigger_name).join(', ') || 'ninguno'}`);

        console.log('\n[2/3] Eliminando triggers obsoletos...');
        await client.query(`
            DROP TRIGGER IF EXISTS calcular_horas_descanso_trigger ON viajes;
            DROP TRIGGER IF EXISTS trigger_calcular_horas_descanso ON viajes;
        `);
        console.log('✓ Triggers eliminados');

        console.log('\n[3/3] Eliminando función obsoleta con CASCADE...');
        await client.query(`
            DROP FUNCTION IF EXISTS calcular_horas_descanso() CASCADE;
        `);
        console.log('✓ Función eliminada');

        console.log('\n✅ Limpieza completada exitosamente');
    } catch (error) {
        console.error('❌ Error durante la limpieza:', error);
        throw error;
    } finally {
        await client.end();
    }
}

cleanOldTriggers().catch(console.error);
