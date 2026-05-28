const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.mkthvbllpccrsanuyrlk:leonardolipiejko@aws-1-us-east-2.pooler.supabase.com:6543/postgres'
});

async function run() {
  await client.connect();
  console.log('Connected to DB');
  
  try {
    // 1. Update existing nulls
    await client.query('UPDATE viajes SET toneladas_cargadas = 0 WHERE toneladas_cargadas IS NULL;');
    console.log('toneladas_cargadas set to 0 for existing rows');

    // 2. Add NOT NULL constraint
    await client.query('ALTER TABLE viajes ALTER COLUMN toneladas_cargadas SET NOT NULL;');
    console.log('toneladas_cargadas is now NOT NULL');
    
    // 3. Set default
    await client.query('ALTER TABLE viajes ALTER COLUMN toneladas_cargadas SET DEFAULT 0;');
    console.log('toneladas_cargadas has default 0');

    // 4. Add viaje_modificado column
    await client.query('ALTER TABLE viajes ADD COLUMN IF NOT EXISTS viaje_modificado BOOLEAN DEFAULT false;');
    console.log('viaje_modificado column added');
    
  } catch (err) {
    console.error('Error altering table:', err);
  } finally {
    await client.end();
  }
}

run();
