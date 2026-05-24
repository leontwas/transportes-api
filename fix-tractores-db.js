const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.mkthvbllpccrsanuyrlk:leonardolipiejko@aws-1-us-east-2.pooler.supabase.com:6543/postgres'
});

async function run() {
  await client.connect();
  console.log('Connected to DB');
  
  try {
    // Drop NOT NULL constraints for tractores
    await client.query('ALTER TABLE tractores ALTER COLUMN marca DROP NOT NULL;');
    console.log('tractor marca is now nullable');
    
    await client.query('ALTER TABLE tractores ALTER COLUMN modelo DROP NOT NULL;');
    console.log('tractor modelo is now nullable');
    
    // seguro may already be nullable or missing, doing it just in case
    await client.query('ALTER TABLE tractores ALTER COLUMN seguro DROP NOT NULL;');
    console.log('tractor seguro is now nullable');
  } catch (err) {
    console.error('Error altering table:', err);
  } finally {
    await client.end();
  }
}

run();
