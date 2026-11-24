/**
 * ============================================================================
 * GramChakra Backend - Demand-Based Dynamic Route Optimization Engine
 * ============================================================================
 * Module: backend/utils/routeOptimizer.js
 * Context: SBM-G Phase II Rural Waste Management & O&M Cost Minimization
 * 
 * Mathematical Foundations:
 * 1. Haversine Metric:
 *    Computes great-circle geodesic distance between two latitude/longitude
 *    coordinates on a spherical earth (mean radius R = 6,371.0 km).
 *    a = sin²(Δφ/2) + cos(φ1) * cos(φ2) * sin²(Δλ/2)
 *    c = 2 * atan2(√a, √(1−a))
 *    d = R * c
 * 
 * 2. Threshold Filtering (Demand Gating):
 *    Filters rural cluster aggregation points strictly exceeding a critical
 *    fill threshold (default: 75%). Prevents running empty collection trips to
 *    partially filled sheds (<75%), eliminating 40-60% of rural fuel waste.
 * 
 * 3. Nearest Neighbor Heuristic (Greedy TSP Tour Constructor):
 *    Starting from the central PWMU depot, iteratively appends the nearest
 *    unvisited eligible village, terminating with a loop return to the depot.
 * 
 * 4. 2-Opt Local Search Heuristic (Tour Untangling):
 *    Iteratively swaps pairs of edges (i, j) if reversing the sub-sequence
 *    strictly shortens the total path length, eliminating geometric crossovers.
 * 
 * 5. Rural O&M Fuel & Carbon Economics:
 *    - Vehicle Fuel Consumption: 4.5 km / Liter (Typical 3.5T rural LCV)
 *    - Diesel Price Baseline: ₹92.00 / Liter
 *    - Carbon Emission Factor: 2.68 kg CO2 / Liter of Diesel
 * ============================================================================
 */

const EARTH_RADIUS_KM = 6371.0;
const DIESEL_KM_PER_LITER = 4.5;
const DIESEL_PRICE_PER_LITER_INR = 92.0;
const CO2_KG_PER_LITER = 2.68;

/**
 * Computes great-circle distance (in kilometers) between two coordinates using the Haversine formula.
 * 
 * @param {number} lat1 - Latitude of origin in degrees
 * @param {number} lon1 - Longitude of origin in degrees
 * @param {number} lat2 - Latitude of destination in degrees
 * @param {number} lon2 - Longitude of destination in degrees
 * @returns {number} Distance in kilometers
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (angle) => (angle * Math.PI) / 180.0;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2.0) * Math.sin(dLon / 2.0);

  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Filters a cluster of villages based on shed fill percentage threshold.
 * 
 * @param {Array<Object>} villages - Array of village records
 * @param {number} thresholdPercent - Minimum fill level threshold (e.g., 75.0)
 * @returns {Array<Object>} Villages meeting or exceeding the threshold
 */
export function filterEligibleVillages(villages, thresholdPercent = 75.0) {
  return villages.filter((v) => Number(v.current_fill_percent) >= Number(thresholdPercent));
}

/**
 * Constructs an initial TSP tour using the Greedy Nearest Neighbor heuristic.
 * 
 * @param {Object} depot - The PWMU central depot object { id, name, latitude, longitude }
 * @param {Array<Object>} stops - List of eligible village stop objects
 * @returns {Array<Object>} Sequential route array starting and ending at depot
 */
export function solveNearestNeighbor(depot, stops) {
  if (!stops || stops.length === 0) {
    return [depot, depot];
  }

  const unvisited = [...stops];
  const tour = [depot];
  let current = depot;

  while (unvisited.length > 0) {
    let nearestIndex = -1;
    let shortestDist = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const candidate = unvisited[i];
      const dist = haversineDistance(
        current.latitude,
        current.longitude,
        candidate.latitude,
        candidate.longitude
      );
      if (dist < shortestDist) {
        shortestDist = dist;
        nearestIndex = i;
      }
    }

    current = unvisited.splice(nearestIndex, 1)[0];
    tour.push(current);
  }

  // Return to central PWMU depot
  tour.push(depot);
  return tour;
}

/**
 * Calculates total geodesic route distance for a given path sequence.
 * 
 * @param {Array<Object>} tour - Ordered list of waypoints
 * @returns {number} Cumulative distance in kilometers
 */
export function calculateTourDistance(tour) {
  if (!tour || tour.length < 2) return 0.0;
  let totalDistance = 0.0;
  for (let i = 0; i < tour.length - 1; i++) {
    totalDistance += haversineDistance(
      tour[i].latitude,
      tour[i].longitude,
      tour[i + 1].latitude,
      tour[i + 1].longitude
    );
  }
  return totalDistance;
}

/**
 * Applies 2-Opt local search refinement to untangle crossovers in the tour.
 * 
 * @param {Array<Object>} tour - Initial route sequence [depot, ...stops, depot]
 * @returns {Array<Object>} Optimized tour sequence
 */
export function apply2Opt(tour) {
  if (!tour || tour.length <= 3) {
    return tour;
  }

  let route = [...tour];
  let improved = true;
  let iterations = 0;
  const MAX_ITERATIONS = 50; // Safety guard for convergence

  while (improved && iterations < MAX_ITERATIONS) {
    improved = false;
    iterations++;

    // Preserve fixed start depot (index 0) and end depot (index route.length - 1)
    for (let i = 1; i < route.length - 2; i++) {
      for (let k = i + 1; k < route.length - 1; k++) {
        const d1 = haversineDistance(
          route[i - 1].latitude,
          route[i - 1].longitude,
          route[i].latitude,
          route[i].longitude
        );
        const d2 = haversineDistance(
          route[k].latitude,
          route[k].longitude,
          route[k + 1].latitude,
          route[k + 1].longitude
        );

        const newD1 = haversineDistance(
          route[i - 1].latitude,
          route[i - 1].longitude,
          route[k].latitude,
          route[k].longitude
        );
        const newD2 = haversineDistance(
          route[i].latitude,
          route[i].longitude,
          route[k + 1].latitude,
          route[k + 1].longitude
        );

        // If the 2-edge swap shortens the tour, reverse the sub-segment
        if (newD1 + newD2 < d1 + d2 - 1e-6) {
          const reversedSegment = route.slice(i, k + 1).reverse();
          route = [
            ...route.slice(0, i),
            ...reversedSegment,
            ...route.slice(k + 1)
          ];
          improved = true;
        }
      }
    }
  }

  return route;
}

/**
 * Computes fuel consumption, financial savings, and carbon reduction metrics.
 * 
 * @param {number} dynamicDistanceKm - Optimized dynamic route distance (km)
 * @param {number} staticBaselineKm - Unoptimized static route visiting all villages (km)
 * @returns {Object} Comprehensive O&M savings metrics
 */
export function calculateRouteMetrics(dynamicDistanceKm, staticBaselineKm) {
  const dynamicDistance = Math.max(0, Number(dynamicDistanceKm) || 0);
  const staticDistance = Math.max(dynamicDistance, Number(staticBaselineKm) || 0);

  // Dynamic route fuel and cost
  const estimatedFuelLiters = dynamicDistance / DIESEL_KM_PER_LITER;
  const estimatedFuelCostInr = estimatedFuelLiters * DIESEL_PRICE_PER_LITER_INR;

  // Static baseline fuel and cost
  const baselineFuelLiters = staticDistance / DIESEL_KM_PER_LITER;
  const baselineFuelCostInr = baselineFuelLiters * DIESEL_PRICE_PER_LITER_INR;

  // Savings
  const distanceSavedKm = Math.max(0, staticDistance - dynamicDistance);
  const fuelSavingsLiters = Math.max(0, baselineFuelLiters - estimatedFuelLiters);
  const fuelSavingsInr = Math.max(0, baselineFuelCostInr - estimatedFuelCostInr);
  const co2SavingsKg = fuelSavingsLiters * CO2_KG_PER_LITER;

  return {
    total_distance_km: Number(dynamicDistance.toFixed(2)),
    estimated_fuel_liters: Number(estimatedFuelLiters.toFixed(2)),
    estimated_fuel_cost_inr: Number(estimatedFuelCostInr.toFixed(2)),
    baseline_static_distance_km: Number(staticDistance.toFixed(2)),
    distance_saved_km: Number(distanceSavedKm.toFixed(2)),
    fuel_savings_liters: Number(fuelSavingsLiters.toFixed(2)),
    fuel_savings_inr: Number(fuelSavingsInr.toFixed(2)),
    co2_savings_kg: Number(co2SavingsKg.toFixed(2))
  };
}

/**
 * Primary Orchestrator: Computes the full dynamic route dispatch solution.
 * 
 * @param {Object} depot - PWMU Central Depot waypoint
 * @param {Array<Object>} allVillages - All villages in the rural cluster
 * @param {number} thresholdPercent - Shed fill threshold (e.g., 75.0)
 * @returns {Object} Route result with ordered stops, waypoints, and savings metrics
 */
export function generateOptimizedPickupRoute(depot, allVillages, thresholdPercent = 75.0) {
  // 1. Calculate static baseline distance (visiting every village sequentially)
  const staticTour = [depot, ...allVillages, depot];
  const staticBaselineKm = calculateTourDistance(staticTour);

  // 2. Filter villages exceeding the dynamic threshold
  const eligibleVillages = filterEligibleVillages(allVillages, thresholdPercent);

  if (eligibleVillages.length === 0) {
    return {
      status: 'NO_ACTION_REQUIRED',
      threshold_filter_percent: thresholdPercent,
      eligible_count: 0,
      total_villages_count: allVillages.length,
      message: `No village collection sheds have breached the ${thresholdPercent}% fill threshold. No vehicle dispatch needed today.`,
      tour: [depot, depot],
      stops: [],
      metrics: calculateRouteMetrics(0, staticBaselineKm)
    };
  }

  // 3. Compute greedy Nearest Neighbor tour
  const nnTour = solveNearestNeighbor(depot, eligibleVillages);

  // 4. Apply 2-Opt local search refinement
  const optimizedTour = apply2Opt(nnTour);
  const dynamicDistanceKm = calculateTourDistance(optimizedTour);

  // 5. Calculate O&M economics and emissions savings
  const metrics = calculateRouteMetrics(dynamicDistanceKm, staticBaselineKm);

  // 6. Format stops sequence
  const stops = optimizedTour
    .slice(1, -1) // Exclude starting and ending depot from stops list
    .map((v, index) => ({
      stop_sequence: index + 1,
      village_id: v.id,
      village_name: v.name,
      panchayat_name: v.panchayat_name,
      latitude: v.latitude,
      longitude: v.longitude,
      village_fill_at_dispatch: v.current_fill_percent,
      collection_status: 'PENDING'
    }));

  return {
    status: 'OPTIMIZED',
    threshold_filter_percent: thresholdPercent,
    eligible_count: eligibleVillages.length,
    total_villages_count: allVillages.length,
    tour: optimizedTour,
    stops,
    metrics
  };
}
