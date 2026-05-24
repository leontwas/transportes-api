const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.mkthvbllpccrsanuyrlk:leonardolipiejko@aws-1-us-east-2.pooler.supabase.com:6543/postgres'
});

async function run() {
  await client.connect();
  console.log('Connected to DB');
  
  try {
    // Drop NOT NULL constraints
    await client.query('ALTER TABLE bateas ALTER COLUMN marca DROP NOT NULL;');
    console.log('marca is now nullable');
    
    await client.query('ALTER TABLE bateas ALTER COLUMN modelo DROP NOT NULL;');
    console.log('modelo is now nullable');
    
    await client.query('ALTER TABLE bateas ALTER COLUMN seguro DROP NOT NULL;');
    console.log('seguro is now nullable');
  } catch (err) {
    console.error('Error altering table:', err);
  } finally {
    await client.end();
  }
}

run();
