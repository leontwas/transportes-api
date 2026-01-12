const { Client } = require('pg');
const bcrypt = require('bcrypt');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'leon4475',
  database: 'tractores_db',
});

async function resetAdminPassword() {
  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    // Verificar si existe el usuario admin
    const existingUser = await client.query(
      "SELECT * FROM usuarios WHERE email = 'admin@transporte.com'"
    );

    if (existingUser.rows.length === 0) {
      console.log('❌ El usuario admin@transporte.com NO existe');
      console.log('   Ejecuta: node scripts/create-admin-user.js');
      return;
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Actualizar la contraseña
    await client.query(
      `UPDATE usuarios
       SET password = $1, actualizado_en = NOW()
       WHERE email = 'admin@transporte.com'`,
      [hashedPassword]
    );

    console.log('✅ Contraseña del admin actualizada exitosamente\n');
    console.log('📝 Credenciales de acceso:');
    console.log('   Email: admin@transporte.com');
    console.log('   Password: admin123');
    console.log('\n💡 Ahora puedes iniciar sesión con estas credenciales');
  } catch (error) {
    console.error('❌ Error al resetear contraseña:', error.message);
  } finally {
    await client.end();
  }
}

resetAdminPassword();
