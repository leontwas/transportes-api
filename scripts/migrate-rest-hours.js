require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'leon4475',
    database: process.env.DB_NAME || 'tractores_db',
});

async function columnExists(tableName, columnName) {
    const result = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
    `, [tableName, columnName]);
    return result.rowCount > 0;
}

async function migrate() {
    try {
        await client.connect();
        console.log('✓ Conectado a la base de datos');

        // 1. Crear tabla periodos_descanso
        console.log('\n[1/5] Creando tabla periodos_descanso...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS periodos_descanso (
                id_periodo SERIAL PRIMARY KEY,
                viaje_id INTEGER NOT NULL,
                inicio_descanso TIMESTAMP NOT NULL,
                fin_descanso TIMESTAMP,
                horas_calculadas DECIMAL(10, 2),
                creado_en TIMESTAMP DEFAULT NOW(),
                actualizado_en TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✓ Tabla periodos_descanso creada');

        // 2. Crear índice en viaje_id para mejorar rendimiento
        console.log('\n[2/5] Creando índice en periodos_descanso.viaje_id...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_periodos_descanso_viaje_id 
            ON periodos_descanso(viaje_id);
        `);
        console.log('✓ Índice creado');

        // 3. Verificar si existen las columnas antiguas
        console.log('\n[3/5] Verificando columnas antiguas...');
        const hasOldColumns = await columnExists('viajes', 'hora_inicio_descanso');

        if (hasOldColumns) {
            console.log('  Columnas antiguas encontradas, migrando datos...');

            // Migrar datos existentes
            const migratedResult = await client.query(`
                INSERT INTO periodos_descanso (viaje_id, inicio_descanso, fin_descanso, horas_calculadas)
                SELECT id_viaje, hora_inicio_descanso, hora_fin_descanso, horas_descanso
                FROM viajes
                WHERE hora_inicio_descanso IS NOT NULL
                RETURNING *;
            `);
            console.log(`  ✓ ${migratedResult.rowCount} períodos de descanso migrados`);

            // Eliminar columnas obsoletas
            console.log('  Eliminando columnas obsoletas...');
            await client.query(`
                ALTER TABLE viajes 
                DROP COLUMN IF EXISTS hora_inicio_descanso,
                DROP COLUMN IF EXISTS hora_fin_descanso,
                DROP COLUMN IF EXISTS horas_descanso;
            `);
            console.log('  ✓ Columnas obsoletas eliminadas');
        } else {
            console.log('  ℹ️  Las columnas antiguas ya fueron eliminadas (TypeORM synchronize)');
        }

        // 4. Agregar columna horas_descansadas si no existe
        console.log('\n[4/5] Verificando columna horas_descansadas...');
        const hasNewColumn = await columnExists('viajes', 'horas_descansadas');

        if (!hasNewColumn) {
            console.log('  Agregando columna horas_descansadas...');
            await client.query(`
                ALTER TABLE viajes 
                ADD COLUMN horas_descansadas DECIMAL(10, 2) DEFAULT 0;
            `);
            console.log('  ✓ Columna horas_descansadas agregada');
        } else {
            console.log('  ℹ️  La columna horas_descansadas ya existe');
        }

        // 5. Calcular y actualizar totales acumulados
        console.log('\n[5/5] Calculando horas acumuladas...');
        await client.query(`
            UPDATE viajes v
            SET horas_descansadas = COALESCE(
                (SELECT SUM(horas_calculadas) 
                 FROM periodos_descanso p 
                 WHERE p.viaje_id = v.id_viaje 
                 AND horas_calculadas IS NOT NULL), 
                0
            );
        `);
        console.log('✓ Horas acumuladas calculadas');

        // Verificación final
        console.log('\n--- Verificación ---');
        const viajesCount = await client.query(
            'SELECT COUNT(*) FROM viajes WHERE horas_descansadas > 0'
        );
        const periodosCount = await client.query('SELECT COUNT(*) FROM periodos_descanso');

        console.log(`✓ Viajes con horas de descanso: ${viajesCount.rows[0].count}`);
        console.log(`✓ Total períodos de descanso: ${periodosCount.rows[0].count}`);

        console.log('\n✅ Migración completada exitosamente');
    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        throw error;
    } finally {
        await client.end();
    }
}

migrate().catch(console.error);
