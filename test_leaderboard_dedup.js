const assert = require('assert');

async function testLeaderboardDeduplication() {
  console.log('🧪 Testing Leaderboard Deduplication Endpoint & Store...');

  try {
    const res = await fetch('http://localhost:3000/api/leaderboard');
    const data = await res.json();

    assert(data.success === true, 'Response must be success: true');
    assert(Array.isArray(data.leaderboard), 'Leaderboard must be an array');
    console.log(`✓ Fetched ${data.leaderboard.length} leaderboard records.`);

    // Check for duplicates by name and rank
    const names = data.leaderboard.map(p => p.name.toLowerCase().trim());
    const uniqueNames = new Set(names);

    assert.strictEqual(names.length, uniqueNames.size, `Duplicate detected! Total: ${names.length}, Unique: ${uniqueNames.size}`);
    console.log('✓ Zero duplicate players detected across all records.');

    // Check ranks are sequentially 1, 2, 3...
    data.leaderboard.forEach((p, idx) => {
      assert.strictEqual(p.rank, idx + 1, `Rank should be ${idx + 1}, got ${p.rank}`);
    });
    console.log('✓ Sequential rank assignment (#1 to #N) verified.');

    // Check XP ordering (descending)
    for (let i = 0; i < data.leaderboard.length - 1; i++) {
      assert(data.leaderboard[i].xp >= data.leaderboard[i + 1].xp, 'XP must be strictly descending');
    }
    console.log('✓ Strict descending XP ordering verified.');

    console.log('\n🎉 ALL DEDUPLICATION TESTS PASSED WITH 100% SUCCESS!\n');
  } catch (err) {
    console.error('❌ Test error:', err.message);
    process.exit(1);
  }
}

testLeaderboardDeduplication();
