const { Client } = require('pg');
const bcrypt = require('bcrypt');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'leon4475',
  database: 'tractores_db',
});

async function createAdminUser() {
  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    // Verificar si ya existe el usuario
    const existingUser = await client.query(
      "SELECT * FROM usuarios WHERE email = 'admin@transporte.com'"
    );

    if (existingUser.rows.length > 0) {
      console.log('⚠️  El usuario admin@transporte.com ya existe');
      console.log('   Usuario ID:', existingUser.rows[0].usuario_id);
      console.log('   Nombre:', existingUser.rows[0].nombre);
      console.log('   Email:', existingUser.rows[0].email);
      console.log('   Rol:', existingUser.rows[0].rol);
      console.log('   Activo:', existingUser.rows[0].activo);
      return;
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Crear el usuario admin
    const result = await client.query(
      `INSERT INTO usuarios (email, password, nombre, rol, activo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING usuario_id, email, nombre, rol, activo, creado_en`,
      ['admin@transporte.com', hashedPassword, 'Administrador', 'admin', true]
    );

    console.log('✅ Usuario administrador creado exitosamente:\n');
    console.log('   Usuario ID:', result.rows[0].usuario_id);
    console.log('   Email:', result.rows[0].email);
    console.log('   Nombre:', result.rows[0].nombre);
    console.log('   Rol:', result.rows[0].rol);
    console.log('   Activo:', result.rows[0].activo);
    console.log('   Creado:', result.rows[0].creado_en);
    console.log('\n📝 Credenciales de acceso:');
    console.log('   Email: admin@transporte.com');
    console.log('   Password: admin123');
  } catch (error) {
    console.error('❌ Error al crear usuario admin:', error.message);
  } finally {
    await client.end();
  }
}

createAdminUser();
