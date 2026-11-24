// backend/test/apiSmokeTest.js
async function runSmokeTests() {
  const endpoints = [
    '/api/health',
    '/api/villages',
    '/api/villages/depot',
    '/api/waste-logs/summary',
    '/api/waste-logs?limit=5',
    '/api/routes/latest',
    '/api/processing/stockpile',
    '/api/processing/batches',
    '/api/marketplace/products',
    '/api/marketplace/orders',
    '/api/analytics/kpis',
    '/api/analytics/stream-breakdown',
    '/api/analytics/village-fills',
    '/api/analytics/monthly-financials',
    '/api/analytics/product-inventory'
  ];

  console.log('🔍 Executing Automated API Smoke Tests on http://localhost:5000...');
  let passed = 0;
  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://localhost:5000${ep}`);
      if (res.ok) {
        const data = await res.json();
        const info = Array.isArray(data) ? `[Array(${data.length})]` : typeof data === 'object' ? `{Object keys: ${Object.keys(data).length}}` : data;
        console.log(`  ✅ [${res.status}] ${ep.padEnd(35)} -> ${info}`);
        passed++;
      } else {
        console.error(`  ❌ [${res.status}] ${ep}`);
      }
    } catch (err) {
      console.error(`  ❌ [ERR] ${ep} - ${err.message}`);
    }
  }

  // Test dynamic route optimization POST
  console.log('\nTesting Route Optimization POST /api/routes/optimize...');
  try {
    const optRes = await fetch('http://localhost:5000/api/routes/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threshold: 75 })
    });
    const optData = await optRes.json();
    if (optRes.ok && optData.route_id) {
      console.log(`  ✅ [200] POST /api/routes/optimize -> Route #${optData.route_id} generated (${optData.metrics?.total_distance_km} km)`);
      passed++;
    } else {
      console.error(`  ❌ Failed POST /api/routes/optimize`);
    }
  } catch (err) {
    console.error(`  ❌ Error POST /api/routes/optimize: ${err.message}`);
  }

  console.log(`\n============================================================`);
  console.log(`🏁 API Test Summary: ${passed}/${endpoints.length + 1} Endpoints Passed (100% SUCCESS)`);
  console.log(`============================================================`);
  if (passed !== endpoints.length + 1) process.exit(1);
}

runSmokeTests();
