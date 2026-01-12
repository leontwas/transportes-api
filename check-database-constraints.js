const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'leon4475',
  database: 'tractores_db',
});

async function checkConstraints() {
  try {
    await client.connect();
    console.log('✓ Conectado a la base de datos\n');

    console.log('═══════════════════════════════════════════════════');
    console.log('    🔍 VERIFICANDO CONSTRAINTS EN LA BASE DE DATOS');
    console.log('═══════════════════════════════════════════════════\n');

    // Verificar FK constraints
    console.log('📋 1. Foreign Key Constraints:\n');
    const fks = await client.query(`
      SELECT
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('choferes', 'tractores', 'bateas')
      ORDER BY tc.table_name, tc.constraint_name;
    `);

    if (fks.rows.length === 0) {
      console.log('   ✅ No hay FK constraints\n');
    } else {
      console.log(`   ⚠️  ${fks.rows.length} FK constraints encontradas:\n`);
      fks.rows.forEach((fk) => {
        console.log(`   ${fk.table_name}.${fk.constraint_name}`);
        console.log(
          `      ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`,
        );
      });
      console.log('');
    }

    // Verificar estructura de tablas
    console.log('📋 2. Estructura de tabla CHOFERES:\n');
    const choferesColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'choferes'
      ORDER BY ordinal_position;
    `);

    choferesColumns.rows.forEach((col) => {
      console.log(
        `   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'})`,
      );
    });

    console.log('\n📋 3. Estructura de tabla BATEAS:\n');
    const bateasColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'bateas'
      ORDER BY ordinal_position;
    `);

    bateasColumns.rows.forEach((col) => {
      console.log(
        `   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'})`,
      );
    });

    console.log('\n📋 4. Chofer ID 4 y sus relaciones:\n');
    const chofer4 = await client.query(`
      SELECT * FROM choferes WHERE id_chofer = 4;
    `);

    if (chofer4.rows.length > 0) {
      console.log('   Chofer encontrado:');
      console.log('   ', JSON.stringify(chofer4.rows[0], null, 2));

      if (chofer4.rows[0].batea_id) {
        console.log(`\n   Batea ${chofer4.rows[0].batea_id}:`);
        const batea = await client.query(`
          SELECT * FROM bateas WHERE batea_id = $1;
        `, [chofer4.rows[0].batea_id]);

        if (batea.rows.length > 0) {
          console.log('   ', JSON.stringify(batea.rows[0], null, 2));
        }
      }
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('    📊 DIAGNÓSTICO');
    console.log('═══════════════════════════════════════════════════\n');

    if (fks.rows.length > 0) {
      console.log('⚠️  Problema encontrado: Hay FK constraints que impiden DELETE\n');
      console.log('Solución: Las entidades TypeORM ya tienen createForeignKeyConstraints: false');
      console.log('          Pero las constraints antiguas todavía existen en la BD\n');
      console.log('💡 Recomendación: Reiniciar la base de datos (synchronize: true)');
      console.log('   o eliminar manualmente las constraints');
    } else {
      console.log('✅ No hay FK constraints bloqueantes\n');
      console.log('   El problema debe ser otra cosa en el código de eliminación');
    }

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
  }
}

checkConstraints();
