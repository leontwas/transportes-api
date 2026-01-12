const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'leon4475',
  database: 'tractores_db',
});

async function checkViajesColumn() {
  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    // Verificar estructura de la columna estado_viaje
    const result = await client.query(`
      SELECT
        column_name,
        data_type,
        udt_name,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'viajes'
      AND column_name = 'estado_viaje';
    `);

    console.log('📋 Información de la columna estado_viaje:');
    console.log(result.rows[0]);

    // Listar todos los valores únicos en la columna
    const values = await client.query(`
      SELECT DISTINCT estado_viaje
      FROM viajes
      ORDER BY estado_viaje;
    `);

    console.log('\n📊 Valores actuales en la columna estado_viaje:');
    values.rows.forEach((row) => {
      console.log(`   - ${row.estado_viaje}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkViajesColumn();
