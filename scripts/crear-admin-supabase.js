/**
 * Script para crear usuario admin en Supabase
 * Ejecutar con: node scripts/crear-admin-supabase.js
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';

async function crearAdminInicial() {
  console.log('\n🔧 Creando usuario administrador inicial...\n');

  try {
    const response = await axios.post(`${API_URL}/auth/register`, {
      email: 'admin@transporte.com',
      password: 'admin123',
      nombre_completo: 'Administrador Sistema',
    });

    console.log('✅ Usuario admin creado exitosamente:');
    console.log('   📧 Email:', response.data.usuario.email);
    console.log('   👤 Nombre:', response.data.usuario.nombre);
    console.log('   🔑 Rol:', response.data.usuario.rol || 'admin');
    console.log('\n📝 Credenciales de acceso:');
    console.log('   Email: admin@transporte.com');
    console.log('   Password: admin123');
    console.log('\n');

  } catch (error) {
    if (error.response) {
      console.error('❌ Error:', error.response.data.message || error.response.data);

      if (error.response.data.message?.includes('ya existe')) {
        console.log('\n💡 El usuario admin ya existe. Puedes usar:');
        console.log('   Email: admin@transporte.com');
        console.log('   Password: admin123\n');
      }
    } else {
      console.error('❌ Error de conexión:', error.message);
      console.log('\n💡 Asegúrate de que el servidor esté corriendo: npm run start:dev\n');
    }
  }
}

crearAdminInicial();