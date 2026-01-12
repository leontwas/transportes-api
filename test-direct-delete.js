const { Client } = require('pg');

async function testDirectDelete() {
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

    // Verificar chofer ID 4
    console.log('📋 Verificando chofer ID 4...');
    const choferQuery = await client.query(
      'SELECT * FROM choferes WHERE id_chofer = $1',
      [4],
    );

    if (choferQuery.rows.length === 0) {
      console.log('❌ Chofer ID 4 no existe\n');
      return;
    }

    console.log('✅ Chofer encontrado:');
    console.log('   ', choferQuery.rows[0]);
    console.log('');

    // Intentar eliminación directa en SQL
    console.log('📋 Intentando DELETE directo en SQL...');
    const deleteResult = await client.query(
      'DELETE FROM choferes WHERE id_chofer = $1',
      [4],
    );

    console.log(`✅ DELETE exitoso! Filas afectadas: ${deleteResult.rowCount}\n`);

    // Verificar que se eliminó
    const verifyQuery = await client.query(
      'SELECT * FROM choferes WHERE id_chofer = $1',
      [4],
    );

    if (verifyQuery.rows.length === 0) {
      console.log('✅ Chofer ID 4 eliminado correctamente\n');
    } else {
      console.log('❌ El chofer todavía existe después del DELETE\n');
    }

    // Verificar estado de la batea 10
    console.log('📋 Verificando batea 10 después del DELETE...');
    const bateaQuery = await client.query(
      'SELECT * FROM bateas WHERE batea_id = $1',
      [10],
    );

    if (bateaQuery.rows.length > 0) {
      console.log('✅ Batea 10 estado:');
      console.log(`   chofer_id: ${bateaQuery.rows[0].chofer_id}`);
      console.log(
        `   (Debería ser NULL o 4, no hay FK constraint que lo impida)\n`,
      );
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('   Code:', error.code);
    console.log('   Detail:', error.detail);
    console.log('');

    if (error.code === '23503') {
      console.log('⚠️  ERROR: Foreign Key Constraint violation!');
      console.log('   Esto significa que SÍ hay FK constraints en la BD\n');
    }
  } finally {
    await client.end();
  }
}

testDirectDelete();
