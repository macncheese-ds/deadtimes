// Test script to verify API endpoints work correctly
const https = require('https');

const apiUrl = 'http://localhost:3107/api';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(apiUrl + path);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const protocol = url.protocol === 'https:' ? require('https') : require('http');
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testProductionAPI() {
  try {
    console.log('🔍 Testing Production API Endpoints');
    console.log('=====================================\n');

    // Test 1: Get líneas
    console.log('1️⃣  GET /api/deadtimes/lineas');
    try {
      const lineasResponse = await makeRequest('GET', '/deadtimes/lineas');
      console.log('   ✅ Status:', lineasResponse.status);
      const linea = lineasResponse.data.data?.[0]?.linea || '1';
      console.log(`   Using línea: ${linea}\n`);

      // Test 2: Get modelos for the línea
      console.log(`2️⃣  GET /api/produccion/modelos?linea=${linea}`);
      try {
        const modelosResponse = await makeRequest('GET', `/produccion/modelos?linea=${linea}`);
        console.log('   ✅ Status:', modelosResponse.status);
        console.log(`      Total modelos: ${modelosResponse.data.data?.length || 0}`);
        if (modelosResponse.data.data?.length > 0) {
          console.log(`      Sample: ${modelosResponse.data.data[0].modelo}`);
        }
      } catch (err) {
        console.log('   ❌ Error:', err.message);
      }
      console.log('');

      // Test 3: POST to initialize intervalos
      const fecha = new Date().toISOString().split('T')[0];
      const turno = 1;
      
      console.log(`3️⃣  POST /api/produccion/intervalos`);
      console.log(`   Body: { linea: "${linea}", fecha: "${fecha}", turno: ${turno} }`);
      try {
        const postResponse = await makeRequest('POST', '/produccion/intervalos', { linea, fecha, turno });
        console.log('   ✅ Status:', postResponse.status);
        console.log('      Response:', postResponse.data);
      } catch (err) {
        console.log('   ❌ Error:', err.message);
      }
      console.log('');

      // Test 4: GET intervalos after POST
      console.log(`4️⃣  GET /api/produccion/intervalos?linea=${linea}&fecha=${fecha}&turno=${turno}`);
      try {
        const getResponse = await makeRequest('GET', `/produccion/intervalos?linea=${linea}&fecha=${fecha}&turno=${turno}`);
        console.log('   ✅ Status:', getResponse.status);
        console.log(`      Total intervalos: ${getResponse.data.data?.length || 0}`);
        console.log(`      Totales:`, getResponse.data.totales);
        if (getResponse.data.data?.length > 0) {
          console.log(`      First interval: hora=${getResponse.data.data[0].hora_inicio}, produccion=${getResponse.data.data[0].produccion}, scrap=${getResponse.data.data[0].scrap}`);
        }
      } catch (err) {
        console.log('   ❌ Error:', err.message);
      }
      console.log('');

    } catch (err) {
      console.log('   ❌ Error:', err.message);
    }

    console.log('\n🏁 Testing complete');

  } catch (error) {
    console.error('Fatal error:', error.message);
  }
}

testProductionAPI();
