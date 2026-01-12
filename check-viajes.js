const { Client } = require('pg');

async function checkViajes() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'tractores_db',
    user: 'postgres',
    password: 'leon4475',
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    // Check all viajes
    console.log('📋 Verificando viajes en la base de datos...');
    const viajesQuery = await client.query('SELECT * FROM viajes');

    console.log(`Total de viajes: ${viajesQuery.rows.length}\n`);

    if (viajesQuery.rows.length > 0) {
      console.log('Viajes encontrados:');
      viajesQuery.rows.forEach((viaje) => {
        console.log(`  - Viaje ${viaje.id_viaje}:`);
        console.log(`    Chofer: ${viaje.chofer_id}`);
        console.log(`    Tractor: ${viaje.tractor_id}`);
        console.log(`    Batea: ${viaje.batea_id}`);
        console.log(`    Estado: ${viaje.estado}`);
        console.log(`    Origen: ${viaje.origen} -> Destino: ${viaje.destino}`);
        console.log('');
      });
    }

    // Check FK constraints on viajes table
    console.log('📋 Verificando constraints en tabla viajes...');
    const constraintsQuery = await client.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'viajes';
    `);

    console.log(`\nForeign Key Constraints en viajes: ${constraintsQuery.rows.length}`);
    constraintsQuery.rows.forEach((fk) => {
      console.log(`  - ${fk.constraint_name}:`);
      console.log(`    ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkViajes();
