const http = require('http');

function makeRequest(method, path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: method,
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, data });
          }
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.end();
  });
}

async function test() {
  console.log('='.repeat(50));
  console.log('  API STATUS CHECK');
  console.log('='.repeat(50), '\n');

  const chofer = await makeRequest('GET', '/api/v1/choferes/1');

  if (chofer.status !== 200) {
    console.log('❌ Error al obtener chofer:', chofer.status);
    return;
  }

  console.log('✅ GET /api/v1/choferes/1 - Status:', chofer.status, '\n');

  console.log('Datos del chofer:');
  console.log('  ID:', chofer.data.id_chofer);
  console.log('  Nombre:', chofer.data.nombre_completo);
  console.log('  Estado:', chofer.data.estado_chofer);
  console.log('  Tractor ID:', chofer.data.tractor_id);
  console.log('  Batea ID:', chofer.data.batea_id, '\n');

  console.log('Relaciones pobladas:');
  if (chofer.data.tractor) {
    console.log('  ✅ Tractor:', {
      id: chofer.data.tractor.tractor_id,
      marca: chofer.data.tractor.marca,
      modelo: chofer.data.tractor.modelo,
      patente: chofer.data.tractor.patente,
      chofer_id: chofer.data.tractor.chofer_id,
    });
  } else {
    console.log('  ❌ Tractor: NO POBLADO (null o undefined)');
  }

  if (chofer.data.batea) {
    console.log('  ✅ Batea:', {
      id: chofer.data.batea.batea_id,
      marca: chofer.data.batea.marca,
      modelo: chofer.data.batea.modelo,
      patente: chofer.data.batea.patente,
      chofer_id: chofer.data.batea.chofer_id,
    });
  } else {
    console.log('  ❌ Batea: NO POBLADA (null o undefined)');
  }

  console.log('\n' + '='.repeat(50));

  const poblado = chofer.data.tractor && chofer.data.batea;
  if (poblado) {
    console.log('  ✅ ENDPOINT CORRECTO - Relaciones pobladas');
  } else {
    console.log('  ❌ FALTA POBLAR RELACIONES');
  }

  console.log('='.repeat(50));
}

test().catch(console.error);
