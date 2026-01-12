const { Client } = require('pg');

async function checkFKDetailed() {
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

    // Method 1: Using pg_constraint
    console.log('📋 Método 1: Usando pg_constraint...');
    const pgConstraintQuery = await client.query(`
      SELECT
        con.conname AS constraint_name,
        con.contype AS constraint_type,
        tbl.relname AS table_name,
        col.attname AS column_name,
        referenced_tbl.relname AS referenced_table,
        referenced_field.attname AS referenced_column
      FROM pg_constraint con
      JOIN pg_class tbl ON tbl.oid = con.conrelid
      JOIN pg_attribute col ON col.attrelid = tbl.oid AND col.attnum = ANY(con.conkey)
      LEFT JOIN pg_class referenced_tbl ON referenced_tbl.oid = con.confrelid
      LEFT JOIN pg_attribute referenced_field ON referenced_field.attrelid = referenced_tbl.oid AND referenced_field.attnum = ANY(con.confkey)
      WHERE con.contype = 'f'
        AND tbl.relname = 'viajes';
    `);

    console.log(`\nFK Constraints encontrados: ${pgConstraintQuery.rows.length}\n`);

    if (pgConstraintQuery.rows.length > 0) {
      pgConstraintQuery.rows.forEach((fk) => {
        console.log(`  - ${fk.constraint_name}:`);
        console.log(
          `    ${fk.table_name}.${fk.column_name} -> ${fk.referenced_table}.${fk.referenced_column}`,
        );
      });
      console.log('');
    }

    // Method 2: Try to delete chofer 4 again
    console.log('📋 Método 2: Intentar DELETE de chofer 4...');
    try {
      await client.query('DELETE FROM choferes WHERE id_chofer = $1', [4]);
      console.log('✅ DELETE exitoso! No hay FK constraints bloqueando\n');
    } catch (error) {
      console.log('❌ DELETE falló:');
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Constraint: ${error.constraint}\n`);

      if (error.code === '23503') {
        console.log('⚠️  Esto confirma que SÍ hay FK constraint activo\n');

        // Extract constraint name and drop it
        const constraintName = error.constraint;
        console.log(`🗑️  Intentando eliminar constraint: ${constraintName}...`);

        try {
          await client.query(
            `ALTER TABLE viajes DROP CONSTRAINT ${constraintName}`,
          );
          console.log('✅ Constraint eliminado exitosamente\n');

          // Try delete again
          console.log('📋 Intentando DELETE nuevamente...');
          await client.query('DELETE FROM choferes WHERE id_chofer = $1', [4]);
          console.log('✅ DELETE exitoso después de eliminar constraint!\n');
        } catch (dropError) {
          console.log(`❌ Error al eliminar constraint: ${dropError.message}\n`);
        }
      }
    }
  } catch (error) {
    console.log('❌ Error general:', error.message);
  } finally {
    await client.end();
  }
}

checkFKDetailed();
