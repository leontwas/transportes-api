const { Client } = require('pg');
const bcrypt = require('bcrypt');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'leon4475',
  database: 'tractores_db',
});

async function createChoferUser() {
  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    // 1. Verificar que exista al menos un chofer en la base de datos
    const choferesDisponibles = await client.query(
      'SELECT * FROM choferes ORDER BY id_chofer'
    );

    if (choferesDisponibles.rows.length === 0) {
      console.log('❌ No hay choferes en la base de datos');
      console.log('   Primero crea un chofer desde el panel de administración');
      return;
    }

    console.log('📋 Choferes disponibles:\n');
    choferesDisponibles.rows.forEach((chofer) => {
      console.log(`   ID: ${chofer.id_chofer} - ${chofer.nombre_completo} (Estado: ${chofer.estado_chofer})`);
    });

    // 2. Solicitar ID del chofer (por defecto el primero)
    const choferSeleccionado = choferesDisponibles.rows[0];
    console.log(`\n✓ Seleccionando chofer: ${choferSeleccionado.nombre_completo} (ID: ${choferSeleccionado.id_chofer})`);

    // 3. Verificar si ya existe un usuario para este chofer
    const usuarioExistente = await client.query(
      'SELECT * FROM usuarios WHERE chofer_id = $1',
      [choferSeleccionado.id_chofer]
    );

    if (usuarioExistente.rows.length > 0) {
      console.log('\n⚠️  Ya existe un usuario para este chofer:');
      console.log('   Email:', usuarioExistente.rows[0].email);
      console.log('   Nombre:', usuarioExistente.rows[0].nombre);
      console.log('   Rol:', usuarioExistente.rows[0].rol);
      console.log('\n   Para crear otro usuario chofer, asigna un chofer diferente');
      return;
    }

    // 4. Generar email basado en el nombre del chofer
    const nombreLimpio = choferSeleccionado.nombre_completo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/\s+/g, '.');

    const email = `${nombreLimpio}@transporte.com`;

    // 5. Verificar que el email no esté en uso
    const emailExistente = await client.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email]
    );

    if (emailExistente.rows.length > 0) {
      console.log(`\n⚠️  El email ${email} ya está en uso`);
      console.log('   Edita el script para usar un email diferente');
      return;
    }

    // 6. Crear usuario con rol chofer
    const password = 'chofer123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await client.query(
      `INSERT INTO usuarios (email, password, nombre, rol, chofer_id, activo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING usuario_id, email, nombre, rol, chofer_id, activo, creado_en`,
      [email, hashedPassword, choferSeleccionado.nombre_completo, 'chofer', choferSeleccionado.id_chofer, true]
    );

    console.log('\n✅ Usuario chofer creado exitosamente:\n');
    console.log('   Usuario ID:', result.rows[0].usuario_id);
    console.log('   Email:', result.rows[0].email);
    console.log('   Nombre:', result.rows[0].nombre);
    console.log('   Rol:', result.rows[0].rol);
    console.log('   Chofer ID:', result.rows[0].chofer_id);
    console.log('   Activo:', result.rows[0].activo);
    console.log('   Creado:', result.rows[0].creado_en);
    console.log('\n📝 Credenciales de acceso:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n🚛 Este usuario podrá actualizar su estado desde la app móvil\n');
  } catch (error) {
    console.error('❌ Error al crear usuario chofer:', error.message);
  } finally {
    await client.end();
  }
}

createChoferUser();
