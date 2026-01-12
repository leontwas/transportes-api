const { Client } = require('pg');

async function fixEnum() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'leon4475',
        database: 'tractores_db',
    });

    try {
        await client.connect();
        console.log('Connected to PostgreSQL');

        // 1. Add new enum values if not exist (using DO block for safety)
        await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'choferes_estado_chofer_enum' AND e.enumlabel = 'libre_o_disponible') THEN
          ALTER TYPE "choferes_estado_chofer_enum" ADD VALUE 'libre_o_disponible';
        END IF;
      END
      $$;
    `);
        console.log('✅ Added libre_o_disponible to enum');

        // 2. Add columns if not exist
        await client.query(`
      ALTER TABLE choferes ADD COLUMN IF NOT EXISTS ultimo_inicio_descanso timestamp;
      ALTER TABLE choferes ADD COLUMN IF NOT EXISTS ultimo_fin_descanso timestamp;
    `);
        console.log('✅ Added columns to table');

    } catch (error) {
        console.error('❌ Schema update failed:', error.message);
    } finally {
        await client.end();
    }
}

fixEnum();
