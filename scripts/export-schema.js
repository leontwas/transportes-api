const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'leon4475',
    database: process.env.DB_NAME || 'tractores_db',
});

async function exportSchema() {
    try {
        await client.connect();

        // 1. Obtener Enums si los hay
        const enumsRes = await client.query(`
            SELECT t.typname as name, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as values
            FROM pg_type t 
            JOIN pg_enum e ON t.oid = e.enumtypid  
            JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
            WHERE n.nspname = 'public'
            GROUP BY t.typname
        `);

        let sql = '-- Schema Export for Render\n\n';

        for (const row of enumsRes.rows) {
            sql += `CREATE TYPE ${row.name} AS ENUM (${row.values.split(', ').map(v => `'${v}'`).join(', ')});\n`;
        }
        sql += '\n';

        // 2. Obtener Tablas (Ordenado para evitar problemas de FK)
        const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            AND table_name NOT IN ('migrations', 'typeorm_metadata', 'batea')
        `);

        for (const table of tablesRes.rows) {
            const tableName = table.table_name;
            sql += `-- Table: ${tableName}\n`;

            // Reconstrucción simplificada de CREATE TABLE usando information_schema
            const columnsRes = await client.query(`
                SELECT column_name, data_type, is_nullable, column_default, character_maximum_length, udt_name
                FROM information_schema.columns 
                WHERE table_name = $1 AND table_schema = 'public'
                ORDER BY ordinal_position
            `, [tableName]);

            sql += `CREATE TABLE ${tableName} (\n`;
            const columnDefs = columnsRes.rows.map(col => {
                let type = col.data_type.toUpperCase();
                if (type === 'USER-DEFINED') type = col.udt_name;
                if (col.character_maximum_length) type += `(${col.character_maximum_length})`;

                let def = `  ${col.column_name} ${type}`;
                if (col.is_nullable === 'NO') def += ' NOT NULL';
                if (col.column_default) {
                    // Manejar secuencias
                    if (col.column_default.includes('nextval')) {
                        def = `  ${col.column_name} SERIAL`;
                    } else if (!col.column_default.includes('::')) {
                        def += ` DEFAULT ${col.column_default}`;
                    }
                }
                return def;
            });
            sql += columnDefs.join(',\n');
            sql += '\n);\n\n';
        }

        // Initial Admin Data
        sql += '\n-- Initial Admin Data\n';
        sql += `INSERT INTO usuarios (email, password, nombre, rol, activo) VALUES ('admin@transporte.com', '$2b$10$7b7R.p9Yn8Y6v6R6P6P6Pe6Y6Y6Y6Y6Y6Y6Y6Y6Y6Y6Y6Y6Y6Y6Y', 'Admin Sistema', 'admin', true);\n`;


        // 3. Obtener PKs
        const pksRes = await client.query(`
            SELECT tc.table_name, kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
        `);

        for (const pk of pksRes.rows) {
            sql += `ALTER TABLE ${pk.table_name} ADD PRIMARY KEY (${pk.column_name});\n`;
        }
        sql += '\n';

        // 4. Obtener FKs
        const fksRes = await client.query(`
            SELECT
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
        `);

        for (const fk of fksRes.rows) {
            sql += `ALTER TABLE ${fk.table_name} ADD CONSTRAINT fk_${fk.table_name}_${fk.column_name} FOREIGN KEY (${fk.column_name}) REFERENCES ${fk.foreign_table_name} (${fk.foreign_column_name});\n`;
        }

        const fs = require('fs');
        fs.writeFileSync('scripts/schema.sql', sql);
        console.log('✅ Base de datos exportada a scripts/schema.sql');

    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        await client.end();
    }
}

exportSchema();
