const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'leon4475',
    database: process.env.DB_NAME || 'tractores_db',
});

async function createDashaUser() {
    try {
        await client.connect();
        console.log('✅ Conectado a la base de datos');

        const choferId = 11; // ID de Dasha Lipiejko
        const email = 'dasha@transporte.com';
        const rawPassword = 'chofer123';
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        // 1. Verificar si el usuario ya existe
        const userExists = await client.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (userExists.rowCount > 0) {
            console.log(`⚠️  El usuario ${email} ya existe. Actualizando contraseña...`);
            await client.query('UPDATE usuarios SET password = $1, chofer_id = $2 WHERE email = $3', [hashedPassword, choferId, email]);
        } else {
            // 2. Crear el usuario
            await client.query(
                'INSERT INTO usuarios (email, password, nombre, rol, chofer_id, activo, creado_en, actualizado_en) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())',
                [email, hashedPassword, 'Dasha Lipiejko', 'chofer', choferId, true]
            );
            console.log(`✅ Usuario creado para Dasha Lipiejko`);
        }

        console.log(`
📝 Credenciales de acceso para Dasha:
   Email: ${email}
   Password: ${rawPassword}
        `);

    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        await client.end();
    }
}

createDashaUser();
