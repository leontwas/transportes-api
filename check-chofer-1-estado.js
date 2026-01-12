const { Client } = require('pg');

async function checkChofer1Estado() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'tractores_db',
    user: 'postgres',
    password: 'leon4475',
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    // Check chofer 1
    console.log('📋 Información del Chofer ID 1:\n');
    const choferQuery = await client.query(
      'SELECT * FROM choferes WHERE id_chofer = $1',
      [1],
    );

    if (choferQuery.rows.length === 0) {
      console.log('❌ Chofer ID 1 no existe\n');
      return;
    }

    const chofer = choferQuery.rows[0];
    console.log('Chofer:');
    console.log(`  ID: ${chofer.id_chofer}`);
    console.log(`  Nombre: ${chofer.nombre_completo}`);
    console.log(`  Estado: ${chofer.estado_chofer}`);
    console.log(`  Tractor ID: ${chofer.tractor_id || 'ninguno'}`);
    console.log(`  Batea ID: ${chofer.batea_id || 'ninguna'}\n`);

    // Check viajes del chofer 1
    console.log('📋 Viajes asociados al Chofer ID 1:\n');
    const viajesQuery = await client.query(
      'SELECT * FROM viajes WHERE chofer_id = $1',
      [1],
    );

    if (viajesQuery.rows.length === 0) {
      console.log('  No tiene viajes asignados\n');
    } else {
      console.log(`  Total de viajes: ${viajesQuery.rows.length}\n`);
      viajesQuery.rows.forEach((viaje) => {
        console.log(`  - Viaje ${viaje.id_viaje}:`);
        console.log(`    Estado: ${viaje.estado}`);
        console.log(`    Origen: ${viaje.origen} -> Destino: ${viaje.destino}`);
        console.log(`    Tractor: ${viaje.tractor_id}`);
        console.log(`    Batea: ${viaje.batea_id}\n`);
      });
    }

    // Check if tractor exists
    if (chofer.tractor_id) {
      console.log(`📋 Información del Tractor ID ${chofer.tractor_id}:\n`);
      const tractorQuery = await client.query(
        'SELECT * FROM tractores WHERE tractor_id = $1',
        [chofer.tractor_id],
      );

      if (tractorQuery.rows.length > 0) {
        const tractor = tractorQuery.rows[0];
        console.log(`  Marca: ${tractor.marca}`);
        console.log(`  Modelo: ${tractor.modelo}`);
        console.log(`  Patente: ${tractor.patente}`);
        console.log(`  Estado: ${tractor.estado_tractor}`);
        console.log(`  Chofer ID: ${tractor.chofer_id}\n`);
      } else {
        console.log(`  ⚠️  Tractor ${chofer.tractor_id} no existe (referencia rota)\n`);
      }
    }

    // Check if batea exists
    if (chofer.batea_id) {
      console.log(`📋 Información de la Batea ID ${chofer.batea_id}:\n`);
      const bateaQuery = await client.query(
        'SELECT * FROM bateas WHERE batea_id = $1',
        [chofer.batea_id],
      );

      if (bateaQuery.rows.length > 0) {
        const batea = bateaQuery.rows[0];
        console.log(`  Marca: ${batea.marca}`);
        console.log(`  Modelo: ${batea.modelo}`);
        console.log(`  Patente: ${batea.patente}`);
        console.log(`  Estado: ${batea.estado}`);
        console.log(`  Chofer ID: ${batea.chofer_id}\n`);
      } else {
        console.log(`  ⚠️  Batea ${chofer.batea_id} no existe (referencia rota)\n`);
      }
    }

    // Try to update the chofer name directly in DB
    console.log('📋 Intentar UPDATE directo en la base de datos:\n');
    try {
      await client.query(
        "UPDATE choferes SET nombre_completo = 'Test Update DB' WHERE id_chofer = $1",
        [1],
      );
      console.log('✅ UPDATE exitoso en la base de datos\n');

      // Revert the change
      await client.query(
        `UPDATE choferes SET nombre_completo = $1 WHERE id_chofer = $2`,
        [chofer.nombre_completo, 1],
      );
      console.log('✅ Cambio revertido\n');
    } catch (error) {
      console.log('❌ Error al hacer UPDATE:');
      console.log(`   ${error.message}\n`);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkChofer1Estado();
