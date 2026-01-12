const { Client } = require('pg');

async function fixDatabaseInconsistencies() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'tractores_db',
    user: 'postgres',
    password: 'leon4475',
  });

  try {
    await client.connect();

    console.log('\n' + '═'.repeat(70));
    console.log('  🔧 REPARACIÓN DE INCONSISTENCIAS EN BASE DE DATOS');
    console.log('═'.repeat(70) + '\n');

    let issuesFound = 0;
    let issuesFixed = 0;

    // 1. Limpiar bateas con chofer_id que no existe
    console.log('📋 Verificando bateas huérfanas...');
    const orphanBateas = await client.query(`
      SELECT b.*
      FROM bateas b
      LEFT JOIN choferes c ON b.chofer_id = c.id_chofer
      WHERE b.chofer_id IS NOT NULL AND c.id_chofer IS NULL
    `);

    if (orphanBateas.rows.length > 0) {
      issuesFound += orphanBateas.rows.length;
      console.log(
        `   ⚠️  Encontradas ${orphanBateas.rows.length} bateas con chofer inexistente:`,
      );
      for (const b of orphanBateas.rows) {
        console.log(
          `      Batea ${b.batea_id} (${b.patente}): chofer_id = ${b.chofer_id}`,
        );
      }
      await client.query(
        'UPDATE bateas SET chofer_id = NULL WHERE chofer_id NOT IN (SELECT id_chofer FROM choferes)',
      );
      issuesFixed += orphanBateas.rows.length;
      console.log('   ✅ Referencias limpiadas\n');
    } else {
      console.log('   ✅ No hay bateas huérfanas\n');
    }

    // 2. Limpiar tractores con chofer_id que no existe
    console.log('📋 Verificando tractores huérfanos...');
    const orphanTractores = await client.query(`
      SELECT t.*
      FROM tractores t
      LEFT JOIN choferes c ON t.chofer_id = c.id_chofer
      WHERE t.chofer_id IS NOT NULL AND c.id_chofer IS NULL
    `);

    if (orphanTractores.rows.length > 0) {
      issuesFound += orphanTractores.rows.length;
      console.log(
        `   ⚠️  Encontrados ${orphanTractores.rows.length} tractores con chofer inexistente:`,
      );
      for (const t of orphanTractores.rows) {
        console.log(
          `      Tractor ${t.tractor_id} (${t.patente}): chofer_id = ${t.chofer_id}`,
        );
      }
      await client.query(
        'UPDATE tractores SET chofer_id = NULL WHERE chofer_id NOT IN (SELECT id_chofer FROM choferes)',
      );
      issuesFixed += orphanTractores.rows.length;
      console.log('   ✅ Referencias limpiadas\n');
    } else {
      console.log('   ✅ No hay tractores huérfanos\n');
    }

    // 3. Verificar inconsistencias bidireccionales chofer-batea
    console.log('📋 Verificando consistencia bidireccional chofer-batea...');
    const choferesConBatea = await client.query(
      'SELECT * FROM choferes WHERE batea_id IS NOT NULL',
    );

    for (const chofer of choferesConBatea.rows) {
      const batea = await client.query(
        'SELECT * FROM bateas WHERE batea_id = $1',
        [chofer.batea_id],
      );

      if (batea.rows.length === 0) {
        issuesFound++;
        console.log(
          `   ⚠️  Chofer ${chofer.id_chofer} apunta a batea ${chofer.batea_id} que no existe`,
        );
        await client.query(
          'UPDATE choferes SET batea_id = NULL WHERE id_chofer = $1',
          [chofer.id_chofer],
        );
        issuesFixed++;
        console.log('   ✅ Referencia limpiada');
      } else if (batea.rows[0].chofer_id !== chofer.id_chofer) {
        issuesFound++;
        console.log(
          `   ⚠️  Inconsistencia: Chofer ${chofer.id_chofer} → Batea ${chofer.batea_id}, pero Batea → Chofer ${batea.rows[0].chofer_id}`,
        );
        await client.query(
          'UPDATE bateas SET chofer_id = $1 WHERE batea_id = $2',
          [chofer.id_chofer, chofer.batea_id],
        );
        issuesFixed++;
        console.log('   ✅ Sincronizado: batea.chofer_id actualizado');
      }
    }

    if (choferesConBatea.rows.length === 0 || issuesFound === issuesFixed) {
      console.log('   ✅ Relaciones bidireccionales correctas\n');
    }

    // 4. Verificar inconsistencias bidireccionales chofer-tractor
    console.log('📋 Verificando consistencia bidireccional chofer-tractor...');
    const choferesConTractor = await client.query(
      'SELECT * FROM choferes WHERE tractor_id IS NOT NULL',
    );

    for (const chofer of choferesConTractor.rows) {
      const tractor = await client.query(
        'SELECT * FROM tractores WHERE tractor_id = $1',
        [chofer.tractor_id],
      );

      if (tractor.rows.length === 0) {
        issuesFound++;
        console.log(
          `   ⚠️  Chofer ${chofer.id_chofer} apunta a tractor ${chofer.tractor_id} que no existe`,
        );
        await client.query(
          'UPDATE choferes SET tractor_id = NULL WHERE id_chofer = $1',
          [chofer.id_chofer],
        );
        issuesFixed++;
        console.log('   ✅ Referencia limpiada');
      } else if (tractor.rows[0].chofer_id !== chofer.id_chofer) {
        issuesFound++;
        console.log(
          `   ⚠️  Inconsistencia: Chofer ${chofer.id_chofer} → Tractor ${chofer.tractor_id}, pero Tractor → Chofer ${tractor.rows[0].chofer_id}`,
        );
        await client.query(
          'UPDATE tractores SET chofer_id = $1 WHERE tractor_id = $2',
          [chofer.id_chofer, chofer.tractor_id],
        );
        issuesFixed++;
        console.log('   ✅ Sincronizado: tractor.chofer_id actualizado');
      }
    }

    if (choferesConTractor.rows.length === 0 || issuesFound === issuesFixed) {
      console.log('   ✅ Relaciones bidireccionales correctas\n');
    }

    console.log('═'.repeat(70));
    if (issuesFound === 0) {
      console.log('  ✅ BASE DE DATOS CONSISTENTE - No se encontraron problemas');
    } else {
      console.log(`  ✅ REPARACIÓN COMPLETADA - ${issuesFixed}/${issuesFound} problemas corregidos`);
    }
    console.log('═'.repeat(70) + '\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixDatabaseInconsistencies();
