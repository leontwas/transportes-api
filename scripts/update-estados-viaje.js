const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'leon4475',
  database: 'tractores_db',
});

async function updateEstadosViaje() {
  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    console.log('📋 Estados actuales del enum viajes_estado_viaje_enum:');
    const estadosActuales = await client.query(`
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = 'viajes_estado_viaje_enum'::regtype::oid
      ORDER BY enumsortorder;
    `);
    estadosActuales.rows.forEach((row) => {
      console.log(`   - ${row.enumlabel}`);
    });

    console.log('\n🔄 Agregando nuevos estados al enum...\n');

    // Agregar 'cargando'
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'cargando'
          AND enumtypid = 'viajes_estado_viaje_enum'::regtype::oid
        ) THEN
          ALTER TYPE viajes_estado_viaje_enum ADD VALUE 'cargando' BEFORE 'finalizado';
          RAISE NOTICE 'Estado "cargando" agregado';
        ELSE
          RAISE NOTICE 'Estado "cargando" ya existe';
        END IF;
      END $$;
    `);

    // Agregar 'viajando'
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'viajando'
          AND enumtypid = 'viajes_estado_viaje_enum'::regtype::oid
        ) THEN
          ALTER TYPE viajes_estado_viaje_enum ADD VALUE 'viajando' BEFORE 'finalizado';
          RAISE NOTICE 'Estado "viajando" agregado';
        ELSE
          RAISE NOTICE 'Estado "viajando" ya existe';
        END IF;
      END $$;
    `);

    // Agregar 'descargando'
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'descargando'
          AND enumtypid = 'viajes_estado_viaje_enum'::regtype::oid
        ) THEN
          ALTER TYPE viajes_estado_viaje_enum ADD VALUE 'descargando' BEFORE 'finalizado';
          RAISE NOTICE 'Estado "descargando" agregado';
        ELSE
          RAISE NOTICE 'Estado "descargando" ya existe';
        END IF;
      END $$;
    `);

    console.log('\n📋 Estados actualizados del enum viajes_estado_viaje_enum:');
    const estadosNuevos = await client.query(`
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = 'viajes_estado_viaje_enum'::regtype::oid
      ORDER BY enumsortorder;
    `);
    estadosNuevos.rows.forEach((row) => {
      console.log(`   - ${row.enumlabel}`);
    });

    console.log('\n✅ Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error al ejecutar migración:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

updateEstadosViaje()
  .then(() => {
    console.log('\n🎉 Proceso finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
