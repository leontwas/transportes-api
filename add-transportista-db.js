const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.mkthvbllpccrsanuyrlk:leonardolipiejko@aws-1-us-east-2.pooler.supabase.com:6543/postgres'
});

async function run() {
  await client.connect();
  console.log('Connected to DB');
  
  try {
    // Add transportista column to tractores
    await client.query('ALTER TABLE tractores ADD COLUMN IF NOT EXISTS transportista VARCHAR(255);');
    console.log('tractor transportista column added');
    
    // Add transportista column to bateas
    await client.query('ALTER TABLE bateas ADD COLUMN IF NOT EXISTS transportista VARCHAR(255);');
    console.log('batea transportista column added');
  } catch (err) {
    console.error('Error altering table:', err);
  } finally {
    await client.end();
  }
}

run();
