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

    console.log('\n🔍 REQUEST DEBUG:');
    console.log('URL:', `http://${options.hostname}:${options.port}${options.path}`);
    console.log('Method:', options.method);
    console.log('Body:', JSON.stringify(data, null, 2));

    const req = http.request(options, (res) => {
      let responseData = '';

      console.log('\n📡 RESPONSE DEBUG:');
      console.log('Status Code:', res.statusCode);
      console.log('Headers:', JSON.stringify(res.headers, null, 2));

      res.on('data', (chunk) => (responseData += chunk));
      res.on('end', () => {
        console.log('\n📦 RESPONSE BODY (RAW):');
        console.log(responseData);

        try {
          const parsed = JSON.parse(responseData);
          console.log('\n✅ PARSED JSON:');
          console.log(JSON.stringify(parsed, null, 2));
          console.log('\n🔑 TOKEN CHECK:');
          console.log('access_token exists?', !!parsed.access_token);
          console.log('access_token value:', parsed.access_token);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          console.log('\n❌ JSON PARSE ERROR:', e.message);
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      console.log('\n❌ REQUEST ERROR:', error.message);
      reject(error);
    });

    req.on('timeout', () => {
      console.log('\n❌ REQUEST TIMEOUT');
      req.destroy();
      reject(new Error('Timeout'));
    });

    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test() {
  console.log('='.repeat(70));
  console.log('  🔐 DEBUG: LOGIN ENDPOINT');
  console.log('='.repeat(70));

  const result = await makeRequest('POST', '/api/v1/auth/login', {
    email: 'admin@transporte.com',
    password: 'admin123',
  });

  console.log('\n' + '='.repeat(70));
  console.log('\n📊 FINAL RESULT:');
  console.log('Status:', result.status);
  console.log('Data:', result.data);
  console.log('\n' + '='.repeat(70));
}

test().catch(console.error);
