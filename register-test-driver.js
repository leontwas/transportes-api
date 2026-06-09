const axios = require('axios');

async function run() {
  const email = 'chofer.test@transporte.com';
  const password = 'chofer123';
  const nombre = 'Chofer Test';
  
  try {
    const res = await axios.post('http://localhost:3000/api/v1/auth/register', {
      nombre_completo: nombre,
      email: email,
      password: password,
      cuil: '20123456789'
    });
    console.log('✅ Registered successfully!', res.data);
  } catch (error) {
    console.log('ℹ️ Registration failed (might already exist):', error.response?.data || error.message);
  }
  
  // Try logging in to verify
  try {
    const res = await axios.post('http://localhost:3000/api/v1/auth/login', {
      email: email,
      password: password
    });
    console.log('✅ Login successful!', res.data);
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data || error.message);
  }
}

run();
