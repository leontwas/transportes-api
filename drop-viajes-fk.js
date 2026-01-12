const { Client } = require('pg');

async function dropViajesForeignKeys() {
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

    // Get all FK constraints on viajes table
    console.log('📋 Buscando Foreign Key Constraints en tabla viajes...');
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

    console.log(`\nEncontrados ${constraintsQuery.rows.length} FK constraints:\n`);

    if (constraintsQuery.rows.length === 0) {
      console.log('✅ No hay FK constraints para eliminar\n');
      return;
    }

    // Drop each FK constraint
    for (const fk of constraintsQuery.rows) {
      console.log(`🗑️  Eliminando: ${fk.constraint_name}`);
      console.log(
        `   ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`,
      );

      const dropQuery = `ALTER TABLE ${fk.table_name} DROP CONSTRAINT ${fk.constraint_name}`;

      try {
        await client.query(dropQuery);
        console.log(`   ✅ Eliminado exitosamente\n`);
      } catch (error) {
        console.log(`   ❌ Error al eliminar: ${error.message}\n`);
      }
    }

    // Verify they were deleted
    console.log('📋 Verificando que se eliminaron...');
    const verifyQuery = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY'
        AND table_name = 'viajes';
    `);

    if (verifyQuery.rows.length === 0) {
      console.log('✅ Todos los FK constraints fueron eliminados correctamente\n');
    } else {
      console.log(
        `⚠️  Todavía quedan ${verifyQuery.rows.length} FK constraints:\n`,
      );
      verifyQuery.rows.forEach((row) => {
        console.log(`   - ${row.constraint_name}`);
      });
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

dropViajesForeignKeys();
