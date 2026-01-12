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
  
  console.log('\n🔍 ESTADO ACTUAL DE LA BASE DE DATOS:\n');
  
  // Chofer 1
  const chofer1 = await client.query('SELECT * FROM choferes WHERE id_chofer = 1');
  console.log('Chofer 1:');
  console.log(`  tractor_id: ${chofer1.rows[0].tractor_id}`);
  console.log(`  batea_id: ${chofer1.rows[0].batea_id}`);
  
  // Tractor 1
  const tractor1 = await client.query('SELECT * FROM tractores WHERE tractor_id = 1');
  console.log('\nTractor 1:');
  console.log(`  chofer_id: ${tractor1.rows[0].chofer_id}`);
  console.log(`  batea_id: ${tractor1.rows[0].batea_id}`);
  
  // Batea 1
  const batea1 = await client.query('SELECT * FROM bateas WHERE batea_id = 1');
  console.log('\nBatea 1:');
  console.log(`  chofer_id: ${batea1.rows[0].chofer_id}`);
  console.log(`  tractor_id: ${batea1.rows[0].tractor_id}`);
  
  // Batea 10
  const batea10 = await client.query('SELECT * FROM bateas WHERE batea_id = 10');
  console.log('\nBatea 10:');
  console.log(`  chofer_id: ${batea10.rows[0].chofer_id}`);
  console.log(`  tractor_id: ${batea10.rows[0].tractor_id}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('CORRIGIENDO INCONSISTENCIAS...\n');
  
  // La configuración correcta debería ser:
  // Chofer 1 -> Tractor 1 -> Batea 1 (todos conectados)
  
  await client.query('UPDATE tractores SET batea_id = 1 WHERE tractor_id = 1');
  console.log('✅ Tractor 1: batea_id actualizado a 1');
  
  await client.query('UPDATE bateas SET tractor_id = 1 WHERE batea_id = 1');
  console.log('✅ Batea 1: tractor_id actualizado a 1');
  
  await client.query('UPDATE bateas SET tractor_id = NULL WHERE batea_id = 10');
  console.log('✅ Batea 10: tractor_id limpiado (NULL)');
  
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICACIÓN FINAL:\n');
  
  const chofer1Final = await client.query('SELECT * FROM choferes WHERE id_chofer = 1');
  const tractor1Final = await client.query('SELECT * FROM tractores WHERE tractor_id = 1');
  const batea1Final = await client.query('SELECT * FROM bateas WHERE batea_id = 1');
  
  console.log('Chofer 1: tractor_id=' + chofer1Final.rows[0].tractor_id + ', batea_id=' + chofer1Final.rows[0].batea_id);
  console.log('Tractor 1: chofer_id=' + tractor1Final.rows[0].chofer_id + ', batea_id=' + tractor1Final.rows[0].batea_id);
  console.log('Batea 1: chofer_id=' + batea1Final.rows[0].chofer_id + ', tractor_id=' + batea1Final.rows[0].tractor_id);
  
  console.log('\n✅ CONSISTENCIA RESTAURADA!\n');
  
  await client.end();
})();
