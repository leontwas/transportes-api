const axios = require('axios');
axios.patch('https://transportes-api-bp41.onrender.com/api/v1/choferes/11', {
  nombre_completo: "Test Chofer",
  cuil: 20123456789
}).then(res => console.log(res.data)).catch(err => console.error(err.response ? err.response.data : err.message));
