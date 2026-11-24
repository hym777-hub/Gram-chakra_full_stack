/**
 * ============================================================================
 * GramChakra Test Suite - Dynamic Route Optimizer Verification
 * ============================================================================
 * File: backend/test/routeTest.js
 * Purpose:
 *   Validates the mathematical correctness and business logic of the
 *   demand-based dynamic vehicle routing engine:
 *   1. Haversine spherical distance calculation.
 *   2. Demand threshold filtering (>= 75%).
 *   3. Nearest-Neighbor and 2-Opt TSP optimization.
 *   4. O&M fuel, financial savings, and CO2 reduction formulas.
 * ============================================================================
 */

import assert from 'assert';
import {
  haversineDistance,
  filterEligibleVillages,
  solveNearestNeighbor,
  calculateTourDistance,
  apply2Opt,
  calculateRouteMetrics,
  generateOptimizedPickupRoute
} from '../utils/routeOptimizer.js';

console.log('------------------------------------------------------------');
console.log('🧪 Starting GramChakra Route Optimizer Test Suite...');
console.log('------------------------------------------------------------\n');

let testsPassed = 0;

// Test 1: Haversine distance accuracy
{
  // Test between PWMU Depot (23.2599, 77.4126) and Rampur Kalan (23.2850, 77.4320)
  const dist = haversineDistance(23.2599, 77.4126, 23.2850, 77.4320);
  console.log(`[TEST 1] Haversine Distance (Depot -> Rampur Kalan): ${dist.toFixed(2)} km`);
  assert(dist > 3.0 && dist < 4.0, 'Haversine distance should be approx 3.4 km');
  testsPassed++;
  console.log('  ✅ Test 1 Passed: Haversine spherical distance calculation verified.\n');
}

// Test 2: Threshold Filtering (Strict >= 75% cutoff)
{
  const testVillages = [
    { id: 'V1', name: 'Rampur', current_fill_percent: 88.0 },
    { id: 'V2', name: 'Shivgarh', current_fill_percent: 92.0 },
    { id: 'V3', name: 'Mohanpur', current_fill_percent: 22.0 },
    { id: 'V4', name: 'Barkheda', current_fill_percent: 75.0 }, // Borderline (Must be included)
    { id: 'V5', name: 'Kalyanpur', current_fill_percent: 74.9 }  // Borderline (Must be excluded)
  ];

  const eligible = filterEligibleVillages(testVillages, 75.0);
  console.log(`[TEST 2] Filtered ${eligible.length} / ${testVillages.length} villages with fill >= 75%`);
  assert.strictEqual(eligible.length, 3, 'Only V1 (88%), V2 (92%), and V4 (75%) should be eligible');
  assert(eligible.some((v) => v.id === 'V4'), '75.0% borderline must be included');
  assert(!eligible.some((v) => v.id === 'V5'), '74.9% must be excluded');
  testsPassed++;
  console.log('  ✅ Test 2 Passed: 75% threshold strictly enforced.\n');
}

// Test 3: 2-Opt Optimization Refinement
{
  const depot = { id: 'DEPOT', name: 'Depot', latitude: 23.2599, longitude: 77.4126 };
  // A set of 4 villages in a crossed / tangled order
  const crossedVillages = [
    { id: 'A', name: 'NorthEast', latitude: 23.32, longitude: 77.48 },
    { id: 'B', name: 'SouthWest', latitude: 23.18, longitude: 77.35 },
    { id: 'C', name: 'NorthWest', latitude: 23.31, longitude: 77.36 },
    { id: 'D', name: 'SouthEast', latitude: 23.19, longitude: 77.49 }
  ];

  const unoptimizedTour = [depot, ...crossedVillages, depot];
  const unoptimizedDist = calculateTourDistance(unoptimizedTour);

  const nnTour = solveNearestNeighbor(depot, crossedVillages);
  const nnDist = calculateTourDistance(nnTour);

  const optimizedTour = apply2Opt(nnTour);
  const optimizedDist = calculateTourDistance(optimizedTour);

  console.log(`[TEST 3] Unoptimized Tour Distance: ${unoptimizedDist.toFixed(2)} km`);
  console.log(`[TEST 3] Nearest-Neighbor Distance: ${nnDist.toFixed(2)} km`);
  console.log(`[TEST 3] 2-Opt Refined Distance:    ${optimizedDist.toFixed(2)} km`);

  assert(optimizedDist <= nnDist, '2-Opt distance must be less than or equal to Nearest-Neighbor distance');
  assert(optimizedDist < unoptimizedDist, 'Optimized distance must be strictly shorter than arbitrary crossed order');
  testsPassed++;
  console.log('  ✅ Test 3 Passed: 2-Opt local search refinement untangles tour.\n');
}

// Test 4: O&M Fuel & Financial Savings Math
{
  const dynamicDist = 45.0; // km
  const staticDist = 90.0;  // km (visiting all sheds)

  const metrics = calculateRouteMetrics(dynamicDist, staticDist);
  console.log('[TEST 4] Economic & Carbon Metrics Computed:');
  console.log(`  • Dynamic Route Distance: ${metrics.total_distance_km} km`);
  console.log(`  • Baseline Static Route:  ${metrics.baseline_static_distance_km} km`);
  console.log(`  • Distance Saved:         ${metrics.distance_saved_km} km`);
  console.log(`  • Fuel Consumed:          ${metrics.estimated_fuel_liters} L (Cost: ₹${metrics.estimated_fuel_cost_inr})`);
  console.log(`  • Fuel Saved:             ${metrics.fuel_savings_liters} L (Savings: ₹${metrics.fuel_savings_inr})`);
  console.log(`  • CO2 Avoided:            ${metrics.co2_savings_kg} kg CO2`);

  // Assertions: 45km / 4.5 km/L = 10 Liters -> 10 * 92 = ₹920
  assert.strictEqual(metrics.estimated_fuel_liters, 10.0, 'Fuel consumed should be 10 Liters');
  assert.strictEqual(metrics.estimated_fuel_cost_inr, 920.0, 'Fuel cost should be ₹920');

  // Static: 90km / 4.5 = 20 Liters -> 20 * 92 = ₹1840 -> Savings = ₹920
  assert.strictEqual(metrics.fuel_savings_inr, 920.0, 'Fuel savings should be ₹920');

  // CO2: 10 Liters saved * 2.68 kg/L = 26.8 kg CO2
  assert.strictEqual(metrics.co2_savings_kg, 26.8, 'CO2 saved should be 26.8 kg');
  testsPassed++;
  console.log('  ✅ Test 4 Passed: Fuel and emissions economics calculations verified.\n');
}

// Test 5: End-to-End Orchestrator (10 Village Cluster)
{
  const depot = { id: 'DEPOT_00', name: 'Central PWMU Depot', latitude: 23.2599, longitude: 77.4126 };
  const villages = [
    { id: 'V1', name: 'Rampur Kalan', panchayat_name: 'Rampur GP', latitude: 23.2850, longitude: 77.4320, current_fill_percent: 88.0 },
    { id: 'V2', name: 'Shivgarh', panchayat_name: 'Shivgarh GP', latitude: 23.2210, longitude: 77.3910, current_fill_percent: 92.0 },
    { id: 'V3', name: 'Barkheda', panchayat_name: 'Barkheda GP', latitude: 23.3100, longitude: 77.3750, current_fill_percent: 78.0 },
    { id: 'V4', name: 'Devnagar', panchayat_name: 'Devnagar GP', latitude: 23.2050, longitude: 77.4560, current_fill_percent: 84.0 },
    { id: 'V5', name: 'Anandpur', panchayat_name: 'Anandpur GP', latitude: 23.2920, longitude: 77.4810, current_fill_percent: 76.0 },
    { id: 'V6', name: 'Kalyanpur', panchayat_name: 'Kalyanpur GP', latitude: 23.1890, longitude: 77.3620, current_fill_percent: 35.0 },
    { id: 'V7', name: 'Sundarpur', panchayat_name: 'Sundarpur GP', latitude: 23.3350, longitude: 77.4250, current_fill_percent: 42.0 },
    { id: 'V8', name: 'Mohanpur', panchayat_name: 'Mohanpur GP', latitude: 23.1650, longitude: 77.4200, current_fill_percent: 22.0 },
    { id: 'V9', name: 'Govindgarh', panchayat_name: 'Govindgarh GP', latitude: 23.2420, longitude: 77.5100, current_fill_percent: 55.0 },
    { id: 'V10', name: 'Kishanpur', panchayat_name: 'Kishanpur GP', latitude: 23.3050, longitude: 77.5300, current_fill_percent: 48.0 }
  ];

  const result = generateOptimizedPickupRoute(depot, villages, 75.0);
  console.log(`[TEST 5] Orchestrator Result: Status=${result.status}, Eligible=${result.eligible_count}/${result.total_villages_count}`);
  assert.strictEqual(result.status, 'OPTIMIZED');
  assert.strictEqual(result.eligible_count, 5, 'Exactly 5 villages should be eligible');
  assert.strictEqual(result.stops.length, 5, 'Route should contain exactly 5 stops');
  assert.strictEqual(result.tour[0].id, depot.id, 'Tour must start at Depot');
  assert.strictEqual(result.tour[result.tour.length - 1].id, depot.id, 'Tour must end at Depot');
  assert(result.metrics.fuel_savings_inr > 0, 'Fuel savings must be positive vs static baseline');
  testsPassed++;
  console.log('  ✅ Test 5 Passed: Full orchestrator generated valid closed-loop route with savings.\n');
}

console.log('============================================================');
console.log(`🎉 ALL ${testsPassed} TESTS PASSED SUCCESSFULLY!`);
console.log('============================================================');
