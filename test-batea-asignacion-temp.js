const http = require('http');

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => (responseData += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test() {
  console.log('Testing chofer update with null values...\n');

  const chofer = await makeRequest('GET', '/api/v1/choferes/1');
  console.log('Initial state:', {
    tractor: chofer.data.tractor_id,
    batea: chofer.data.batea_id,
  });

  console.log('\nTest 1: Set tractor and batea to null...');
  const update1 = await makeRequest('PATCH', '/api/v1/choferes/1', {
    nombre_completo: chofer.data.nombre_completo,
    estado_chofer: chofer.data.estado_chofer,
    tractor_id: null,
    batea_id: null,
  });

  if (update1.status === 200) {
    console.log('Success! Tractor:', update1.data.tractor_id, 'Batea:', update1.data.batea_id);
  } else {
    console.log('Error:', update1.status, update1.data);
  }
}

test().catch(console.error);
