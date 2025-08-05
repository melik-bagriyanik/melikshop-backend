const http = require('http');

function testEndpoint(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({
            status: res.statusCode,
            data: jsonBody
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing MelikShop Backend API...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const health = await testEndpoint('/health');
    console.log(`   Status: ${health.status}`);
    console.log(`   Response: ${JSON.stringify(health.data, null, 2)}\n`);

    // Test 2: 404 Route
    console.log('2. Testing 404 Route...');
    const notFound = await testEndpoint('/nonexistent');
    console.log(`   Status: ${notFound.status}`);
    console.log(`   Response: ${JSON.stringify(notFound.data, null, 2)}\n`);

    // Test 3: API Routes (will fail without DB)
    console.log('3. Testing API Routes (will timeout without MongoDB)...');
    try {
      const products = await testEndpoint('/api/products/categories/list');
      console.log(`   Products Status: ${products.status}`);
    } catch (error) {
      console.log('   Products: Expected timeout (no MongoDB connection)');
    }

    console.log('\n✅ Basic server tests completed!');
    console.log('📝 Note: Database-dependent endpoints will timeout without MongoDB');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTests(); 