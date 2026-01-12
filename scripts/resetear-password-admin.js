/**
 * Script para resetear la contraseña del admin en Supabase
 * Ejecutar con: node scripts/resetear-password-admin.js
 */

const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function resetearPasswordAdmin() {
  console.log('\n🔧 Reseteando contraseña del administrador...\n');

  // Conexión a Supabase
  const client = new Client({
    connectionString: 'postgresql://postgres.mkthvbllpccrsanuyrlk:leonardolipiejko@aws-1-us-east-2.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a Supabase\n');

    // Hashear la nueva contraseña
    const password = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    console.log('🔐 Nueva contraseña hasheada:', hashedPassword.substring(0, 20) + '...\n');

    // Actualizar el usuario admin
    const result = await client.query(
      `UPDATE usuarios
       SET password = $1,
           rol = 'admin',
           activo = true,
           actualizado_en = NOW()
       WHERE email = 'admin@transporte.com'
       RETURNING usuario_id, email, nombre, rol`,
      [hashedPassword]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('✅ Contraseña actualizada exitosamente:');
      console.log('   👤 Usuario ID:', user.usuario_id);
      console.log('   📧 Email:', user.email);
      console.log('   📝 Nombre:', user.nombre);
      console.log('   🔑 Rol:', user.rol);
      console.log('\n📝 Credenciales de acceso:');
      console.log('   Email: admin@transporte.com');
      console.log('   Password: admin123');
      console.log('\n✅ Ya puedes hacer login!\n');
    } else {
      console.log('❌ No se encontró el usuario admin@transporte.com\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

resetearPasswordAdmin();