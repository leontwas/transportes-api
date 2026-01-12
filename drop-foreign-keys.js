const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'leon4475',
  database: 'tractores_db',
});

async function dropForeignKeys() {
  try {
    await client.connect();
    console.log('✓ Conectado a la base de datos\n');

    console.log('═══════════════════════════════════════════════════');
    console.log('    🗑️  ELIMINANDO FOREIGN KEY CONSTRAINTS');
    console.log('═══════════════════════════════════════════════════\n');

    // Obtener todas las FK constraints
    const getFKs = await client.query(`
      SELECT
        tc.table_name,
        tc.constraint_name,
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
        AND tc.table_schema = 'public'
        AND tc.table_name IN ('choferes', 'tractores', 'bateas')
      ORDER BY tc.table_name, tc.constraint_name;
    `);

    if (getFKs.rows.length === 0) {
      console.log('✅ No hay foreign keys para eliminar\n');
      await client.end();
      return;
    }

    console.log(`📋 Foreign keys encontradas: ${getFKs.rows.length}\n`);

    for (const fk of getFKs.rows) {
      console.log(`Eliminando: ${fk.table_name}.${fk.constraint_name}`);
      console.log(`  ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);

      try {
        await client.query(
          `ALTER TABLE ${fk.table_name} DROP CONSTRAINT IF EXISTS ${fk.constraint_name};`
        );
        console.log(`  ✅ Eliminada\n`);
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}\n`);
      }
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('    ✅ PROCESO COMPLETADO');
    console.log('═══════════════════════════════════════════════════\n');

    console.log('🔍 Verificando estado actual...\n');

    const checkFKs = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY'
        AND table_schema = 'public'
        AND table_name IN ('choferes', 'tractores', 'bateas');
    `);

    console.log(`📊 Foreign keys restantes: ${checkFKs.rows[0].count}\n`);

    if (parseInt(checkFKs.rows[0].count) === 0) {
      console.log('✅ TODAS las foreign keys han sido eliminadas correctamente\n');
      console.log('💡 Ahora puedes:');
      console.log('   - Eliminar choferes sin restricciones');
      console.log('   - Actualizar cualquier registro libremente');
      console.log('   - Las relaciones seguirán funcionando para queries\n');
    } else {
      console.log('⚠️  Todavía hay algunas foreign keys\n');
    }

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await client.end();
    process.exit(1);
  }
}

dropForeignKeys();
