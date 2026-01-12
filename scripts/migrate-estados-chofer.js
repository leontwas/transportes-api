const { Client } = require('pg');
require('dotenv').config();

async function migrarEstadosChofer() {
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

    // ========================================
    // PASO 1: Verificar enum actual
    // ========================================
    console.log('📋 PASO 1: Verificando enum actual de estado_chofer...\n');

    const enumActual = await client.query(`
      SELECT e.enumlabel AS value
      FROM pg_enum e
      INNER JOIN pg_type t ON t.oid = e.enumtypid
      INNER JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = 'choferes_estado_chofer_enum'
      ORDER BY e.enumsortorder;
    `);

    console.log('Estados actuales en el enum:');
    enumActual.rows.forEach(row => console.log(`   - ${row.value}`));
    console.log('');

    // ========================================
    // PASO 2: Agregar nuevos valores al enum PRIMERO
    // ========================================
    console.log('📋 PASO 2: Agregando nuevos valores al enum...\n');

    const nuevosValores = ['disponible', 'franco', 'equipo_en_reparacion'];

    for (const valor of nuevosValores) {
      try {
        await client.query(`
          ALTER TYPE choferes_estado_chofer_enum ADD VALUE IF NOT EXISTS '${valor}';
        `);
        console.log(`   ✓ Agregado valor "${valor}"`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`   ℹ️  Valor "${valor}" ya existe`);
        } else {
          throw error;
        }
      }
    }
    console.log('');

    // ========================================
    // PASO 3: Migrar datos existentes
    // ========================================
    console.log('📋 PASO 3: Migrando datos existentes...\n');

    // Migrar registros con estados antiguos a nuevos
    await client.query(`
      UPDATE choferes
      SET estado_chofer = 'disponible'
      WHERE estado_chofer = 'libre_o_disponible';
    `);
    console.log('   ✓ Migrados registros de "libre_o_disponible" a "disponible"');

    await client.query(`
      UPDATE choferes
      SET estado_chofer = 'franco'
      WHERE estado_chofer = 'licencia_medica';
    `);
    console.log('   ✓ Migrados registros de "licencia_medica" a "franco"');

    await client.query(`
      UPDATE choferes
      SET estado_chofer = 'equipo_en_reparacion'
      WHERE estado_chofer = 'licencia_art';
    `);
    console.log('   ✓ Migrados registros de "licencia_art" a "equipo_en_reparacion"\n');

    // ========================================
    // PASO 4: Agregar campos de tracking a tabla viajes
    // ========================================
    console.log('📋 PASO 4: Agregando campos de tracking de descanso a tabla viajes...\n');

    await client.query(`
      ALTER TABLE viajes
      ADD COLUMN IF NOT EXISTS hora_inicio_descanso TIMESTAMP;
    `);
    console.log('   ✓ Campo hora_inicio_descanso agregado');

    await client.query(`
      ALTER TABLE viajes
      ADD COLUMN IF NOT EXISTS hora_fin_descanso TIMESTAMP;
    `);
    console.log('   ✓ Campo hora_fin_descanso agregado');

    await client.query(`
      ALTER TABLE viajes
      ADD COLUMN IF NOT EXISTS horas_descanso DECIMAL(5,2);
    `);
    console.log('   ✓ Campo horas_descanso agregado\n');

    // ========================================
    // PASO 5: Verificar resultado final
    // ========================================
    console.log('📋 PASO 5: Verificando resultado final...\n');

    const enumFinal = await client.query(`
      SELECT e.enumlabel AS value
      FROM pg_enum e
      INNER JOIN pg_type t ON t.oid = e.enumtypid
      INNER JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = 'choferes_estado_chofer_enum'
      ORDER BY e.enumsortorder;
    `);

    console.log('Estados finales en el enum:');
    enumFinal.rows.forEach(row => console.log(`   - ${row.value}`));
    console.log('');

    const conteoEstados = await client.query(`
      SELECT estado_chofer, COUNT(*) as cantidad
      FROM choferes
      GROUP BY estado_chofer
      ORDER BY estado_chofer;
    `);

    console.log('Distribución de choferes por estado:');
    conteoEstados.rows.forEach(row => {
      console.log(`   - ${row.estado_chofer}: ${row.cantidad} chofer(es)`);
    });
    console.log('');

    // Verificar estructura de tabla viajes
    const columnasViajes = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'viajes'
      AND column_name IN ('hora_inicio_descanso', 'hora_fin_descanso', 'horas_descanso')
      ORDER BY column_name;
    `);

    console.log('Campos de tracking en tabla viajes:');
    columnasViajes.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
    });
    console.log('');

    console.log('════════════════════════════════════════════════════════════');
    console.log('  ✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════\n');

    console.log('📝 NOTAS IMPORTANTES:\n');
    console.log('1. Los valores antiguos del enum (libre_o_disponible, licencia_medica, licencia_art)');
    console.log('   todavía existen en el enum pero ya no están en uso.');
    console.log('');
    console.log('2. Para eliminarlos completamente, necesitarías recrear el enum,');
    console.log('   lo cual es más complejo y puede causar problemas si hay datos.');
    console.log('');
    console.log('3. Los campos de tracking de descanso ahora están en la tabla viajes.');
    console.log('');
    console.log('4. Los campos ultimo_inicio_descanso y ultimo_fin_descanso en choferes');
    console.log('   ya no se usan, pero pueden mantenerse por compatibilidad.');
    console.log('');

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar migración
migrarEstadosChofer();
