const { Client } = require('pg');
require('dotenv').config();

async function verificarEstados() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'tractores_db',
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    // Verificar enum
    const enumValues = await client.query(`
      SELECT e.enumlabel AS value
      FROM pg_enum e
      INNER JOIN pg_type t ON t.oid = e.enumtypid
      INNER JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = 'choferes_estado_chofer_enum'
      ORDER BY e.enumsortorder;
    `);

    console.log('📋 Valores en el enum estado_chofer:');
    enumValues.rows.forEach(row => console.log(`   - ${row.value}`));
    console.log('');

    // Verificar choferes
    const choferes = await client.query(`
      SELECT id_chofer, nombre_completo, estado_chofer
      FROM choferes
      ORDER BY id_chofer;
    `);

    console.log('📋 Choferes en la base de datos:');
    choferes.rows.forEach(row => {
      console.log(`   - ID ${row.id_chofer}: ${row.nombre_completo} - Estado: ${row.estado_chofer}`);
    });
    console.log('');

    // Verificar tabla viajes
    const columnasViajes = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'viajes'
      AND column_name IN ('hora_inicio_descanso', 'hora_fin_descanso', 'horas_descanso')
      ORDER BY column_name;
    `);

    console.log('📋 Campos de tracking en tabla viajes:');
    if (columnasViajes.rows.length > 0) {
      columnasViajes.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
      });
    } else {
      console.log('   ⚠️  No se encontraron los campos de tracking');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

verificarEstados();
