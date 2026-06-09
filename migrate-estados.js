const { Client } = require('pg');

const connectionString = 'postgresql://postgres.mkthvbllpccrsanuyrlk:leonardolipiejko@aws-1-us-east-2.pooler.supabase.com:6543/postgres';

async function run() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected to DB');

  try {
    // 1. Add 'ocupado' value to the enum for bateas state in Postgres if not already present
    // TypeORM usually maps enum to "bateas_estado_enum"
    console.log('Adding "ocupado" to bateas_estado_enum...');
    try {
      await client.query("ALTER TYPE bateas_estado_enum ADD VALUE IF NOT EXISTS 'ocupado';");
      console.log('Successfully checked/added "ocupado" to enum.');
    } catch (enumErr) {
      console.warn('Could not alter type bateas_estado_enum directly. Let us try to check if it already exists or if we need to recreate.');
      console.error(enumErr);
    }

    // 2. Update bateas to 'ocupado' where tractor_id and chofer_id are assigned
    console.log('Updating bateas status to "ocupado" where tractor_id and chofer_id are not null...');
    const bateaRes = await client.query(`
      UPDATE bateas 
      SET estado = 'ocupado' 
      WHERE tractor_id IS NOT NULL AND chofer_id IS NOT NULL;
    `);
    console.log(`Updated ${bateaRes.rowCount} bateas.`);

    // 3. Update tractores to 'ocupado' where chofer_id and batea_id are assigned, and chofer is not INACTIVO or LICENCIA_ANUAL
    console.log('Updating tractores status to "ocupado" where chofer_id and batea_id are not null and chofer is not inactive or on annual leave...');
    const tractorRes = await client.query(`
      UPDATE tractores 
      SET estado_tractor = 'ocupado'
      WHERE chofer_id IS NOT NULL AND batea_id IS NOT NULL
        AND chofer_id IN (
          SELECT id_chofer 
          FROM choferes 
          WHERE estado_chofer NOT IN ('inactivo', 'licencia_anual')
        );
    `);
    console.log(`Updated ${tractorRes.rowCount} tractores.`);

    // 4. Update tractores and bateas to 'libre' and 'vacio' if the chofer is in 'licencia_anual'
    console.log('Updating tractores and bateas of drivers on licencia_anual to "libre"/"vacio" and unassigning them...');
    const unassignTractores = await client.query(`
      UPDATE tractores
      SET estado_tractor = 'libre', chofer_id = NULL
      WHERE chofer_id IN (
        SELECT id_chofer
        FROM choferes
        WHERE estado_chofer = 'licencia_anual'
      );
    `);
    console.log(`Unassigned/freed ${unassignTractores.rowCount} tractores for drivers on vacation.`);

    const unassignBateas = await client.query(`
      UPDATE bateas
      SET estado = 'vacio', chofer_id = NULL
      WHERE chofer_id IN (
        SELECT id_chofer
        FROM choferes
        WHERE estado_chofer = 'licencia_anual'
      );
    `);
    console.log(`Unassigned/freed ${unassignBateas.rowCount} bateas for drivers on vacation.`);

    const clearChoferResources = await client.query(`
      UPDATE choferes
      SET tractor_id = NULL, batea_id = NULL
      WHERE estado_chofer = 'licencia_anual';
    `);
    console.log(`Cleared tractor/batea references on ${clearChoferResources.rowCount} drivers on vacation.`);

    console.log('Migration finished successfully!');
  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    await client.end();
  }
}

run();
