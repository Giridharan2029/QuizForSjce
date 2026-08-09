const assert = require('assert');
const http = require('http');

console.log('===================================================================');
console.log('🧪 TESTING AUTHENTICATION SYSTEM & LEADERBOARD DEDUPLICATION');
console.log('===================================================================\n');

function makeRequest(url, method = 'GET', postData = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function testAuthAndLeaderboard() {
  const testEmail = `test_user_${Date.now()}@quizverse.com`;
  const testPassword = 'SecurePassword123!';
  const testName = 'Professor Quizmaster';

  try {
    // 1. Test Signup / Registration
    console.log('1. Testing User Registration (POST /api/auth/signup)...');
    const signupRes = await makeRequest('http://localhost:3000/api/auth/signup', 'POST', {
      name: testName,
      email: testEmail,
      password: testPassword
    });

    assert.strictEqual(signupRes.status, 200);
    assert.strictEqual(signupRes.data.success, true);
    assert.strictEqual(signupRes.data.user.email, testEmail);
    console.log(`   ✓ User registered successfully: ${testName} (${testEmail})`);

    // 2. Test Duplicate Email Signup Prevention
    console.log('2. Testing Duplicate Signup Prevention...');
    const dupRes = await makeRequest('http://localhost:3000/api/auth/signup', 'POST', {
      name: 'Duplicate User',
      email: testEmail,
      password: 'AnotherPassword'
    });

    assert.strictEqual(dupRes.status, 400);
    assert.strictEqual(dupRes.data.success, false);
    console.log('   ✓ Duplicate registration correctly rejected with HTTP 400');

    // 3. Test Invalid Password Login
    console.log('3. Testing Login with Invalid Password...');
    const invalidLoginRes = await makeRequest('http://localhost:3000/api/auth/login', 'POST', {
      email: testEmail,
      password: 'WrongPassword'
    });

    assert.strictEqual(invalidLoginRes.status, 401);
    assert.strictEqual(invalidLoginRes.data.success, false);
    console.log('   ✓ Invalid password attempt correctly rejected with HTTP 401');

    // 4. Test Valid Login
    console.log('4. Testing Valid Login (POST /api/auth/login)...');
    const validLoginRes = await makeRequest('http://localhost:3000/api/auth/login', 'POST', {
      email: testEmail,
      password: testPassword
    });

    assert.strictEqual(validLoginRes.status, 200);
    assert.strictEqual(validLoginRes.data.success, true);
    assert.strictEqual(validLoginRes.data.user.email, testEmail);
    console.log(`   ✓ Login successful for ${testName}!`);

    // 5. Test Leaderboard Endpoint Deduplication
    console.log('5. Testing Leaderboard API Endpoint & Deduplication (GET /api/leaderboard)...');
    const lbRes = await makeRequest('http://localhost:3000/api/leaderboard', 'GET');

    assert.strictEqual(lbRes.status, 200);
    assert.strictEqual(lbRes.data.success, true);
    assert(Array.isArray(lbRes.data.leaderboard));

    const leaders = lbRes.data.leaderboard;
    const nameCounts = {};
    leaders.forEach(l => {
      const nameKey = (l.name || '').toLowerCase().trim();
      nameCounts[nameKey] = (nameCounts[nameKey] || 0) + 1;
    });

    Object.keys(nameCounts).forEach(nameKey => {
      assert.strictEqual(nameCounts[nameKey], 1, `Leaderboard contains duplicate entry for "${nameKey}"`);
    });

    console.log(`   ✓ Leaderboard verified! Returned ${leaders.length} unique champion entries with ZERO duplicates.`);

    console.log('\n🎉 ALL AUTHENTICATION AND LEADERBOARD TESTS PASSED 100%!');

  } catch (err) {
    console.error('❌ Test Failed:', err);
    process.exit(1);
  }
}

testAuthAndLeaderboard();
