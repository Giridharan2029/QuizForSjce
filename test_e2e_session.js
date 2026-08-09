const assert = require('assert');
const http = require('http');

console.log('🧪 Running QuizVerse End-to-End API & Host Dashboard Signal Verification...\n');

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
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
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

async function runE2ETest() {
  try {
    // 1. Verify GET /api/quizzes
    console.log('1. Fetching Quizzes...');
    const quizzesRes = await makeRequest('http://localhost:3000/api/quizzes');
    assert.strictEqual(quizzesRes.success, true);
    assert(Array.isArray(quizzesRes.quizzes));
    console.log(`   ✓ Found ${quizzesRes.quizzes.length} quizzes`);

    // 2. Verify GET /api/host/guess-analysis
    console.log('2. Fetching Host-Only Guess Analysis Dashboard Data...');
    const hostRes = await makeRequest('http://localhost:3000/api/host/guess-analysis');
    assert.strictEqual(hostRes.success, true);
    assert(Array.isArray(hostRes.responses));
    assert(Array.isArray(hostRes.confidentWrong));
    assert(Array.isArray(hostRes.luckyGuesses));
    console.log('   ✓ Host-Only Guess Analysis Endpoint is active & structured correctly!');

    // 3. Verify User XP API
    console.log('3. Updating User XP...');
    const xpRes = await makeRequest('http://localhost:3000/api/users/xp', 'POST', {
      userId: 'u_test_host',
      xpGained: 100,
      gamesHostedInc: 1
    });
    assert.strictEqual(xpRes.success, true);
    assert(xpRes.xp >= 100);
    console.log(`   ✓ User XP updated to ${xpRes.xp} (Level ${xpRes.level})`);

    console.log('\n🎉 ALL END-TO-END SYSTEM VERIFICATIONS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Verification Failed:', err);
    process.exit(1);
  }
}

runE2ETest();
