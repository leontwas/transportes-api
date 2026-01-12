const { Client } = require('pg');
const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'tractores_db',
  user: 'postgres',
  password: 'leon4475',
});

(async () => {
  await client.connect();
  
  console.log('\nCHOFERES:');
  const choferes = await client.query('SELECT * FROM choferes ORDER BY id_chofer');
  for (const c of choferes.rows) {
    console.log(`  ${c.id_chofer}: ${c.nombre_completo} | batea_id=${c.batea_id} | tractor_id=${c.tractor_id}`);
  }
  
  console.log('\nBATEAS CON CHOFER ASIGNADO:');
  const bateas = await client.query('SELECT * FROM bateas WHERE chofer_id IS NOT NULL ORDER BY batea_id');
  for (const b of bateas.rows) {
    console.log(`  ${b.batea_id}: ${b.patente} | chofer_id=${b.chofer_id}`);
  }
  
  console.log('\nINCONSISTENCIAS:');
  for (const c of choferes.rows) {
    const bateasDelChofer = await client.query('SELECT * FROM bateas WHERE chofer_id = $1', [c.id_chofer]);
    if (bateasDelChofer.rows.length > 1) {
      console.log(`  ❌ Chofer ${c.id_chofer} está en ${bateasDelChofer.rows.length} bateas:`);
      for (const b of bateasDelChofer.rows) {
        console.log(`     - Batea ${b.batea_id}: ${b.patente}`);
      }
    }
  }
  
  await client.end();
})();
