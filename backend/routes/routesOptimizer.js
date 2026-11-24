/**
 * ============================================================================
 * GramChakra Backend - Dynamic Route Optimization & Dispatch API Router
 * ============================================================================
 * Module: backend/routes/routesOptimizer.js
 * Endpoints:
 *   - POST /api/routes/optimize     : Computes & saves demand-responsive pickup route
 *   - GET  /api/routes              : Historical vehicle route runs
 *   - GET  /api/routes/latest       : Retrieves latest active route with stops
 *   - GET  /api/routes/:id/manifest : Generates printable driver dispatch manifest
 * 
 * SBM-G Domain Context:
 *   Eliminates wasteful fixed-schedule vehicle runs by computing a TSP tour only
 *   for village collection sheds meeting or exceeding the user-selected fill
 *   threshold (default: 75%). Tracks diesel savings in Liters, INR, and CO2.
 * ============================================================================
 */

import { Router } from 'express';
import db from '../db/database.js';
import { CENTRAL_PWMU_DEPOT } from './villages.js';
import { generateOptimizedPickupRoute } from '../utils/routeOptimizer.js';

const router = Router();

/**
 * POST /api/routes/optimize
 * Computes an optimized vehicle collection route for villages >= threshold.
 */
router.post('/optimize', (req, res) => {
  try {
    const {
      threshold = 75.0,
      vehicle_no = 'MP-04-GA-4501 (Tata Ace SBM-G Tipper)'
    } = req.body;

    // 1. Fetch all registered cluster villages
    const allVillages = db.prepare('SELECT * FROM villages').all();
    if (!allVillages || allVillages.length === 0) {
      return res.status(400).json({ success: false, message: 'No villages found in database' });
    }

    // 2. Run algorithmic optimization
    const routePlan = generateOptimizedPickupRoute(
      CENTRAL_PWMU_DEPOT,
      allVillages,
      Number(threshold)
    );

    // If no villages breach threshold
    if (routePlan.status === 'NO_ACTION_REQUIRED') {
      return res.json({
        success: true,
        action_required: false,
        message: routePlan.message,
        data: routePlan
      });
    }

    // 3. Persist route and stops atomically in database
    const routeId = `RT_${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const saveRouteTx = db.transaction(() => {
      // Insert master route
      db.prepare(`
        INSERT INTO collection_routes (
          id, route_date, status, threshold_filter_percent, total_distance_km,
          estimated_fuel_liters, estimated_fuel_cost_inr, baseline_static_distance_km,
          fuel_savings_inr, co2_savings_kg, dispatched_vehicle_no, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        routeId,
        today,
        'DISPATCHED',
        Number(threshold),
        routePlan.metrics.total_distance_km,
        routePlan.metrics.estimated_fuel_liters,
        routePlan.metrics.estimated_fuel_cost_inr,
        routePlan.metrics.baseline_static_distance_km,
        routePlan.metrics.fuel_savings_inr,
        routePlan.metrics.co2_savings_kg,
        vehicle_no,
        now
      );

      // Insert route stops
      const insertStop = db.prepare(`
        INSERT INTO collection_route_stops (
          id, route_id, village_id, stop_sequence, village_fill_at_dispatch, collection_status
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const stop of routePlan.stops) {
        insertStop.run(
          `STOP_${routeId}_${stop.stop_sequence}`,
          routeId,
          stop.village_id,
          stop.stop_sequence,
          stop.village_fill_at_dispatch,
          'PENDING'
        );
      }

      // Record fuel expense in O&M Financial Ledger
      db.prepare(`
        INSERT INTO om_financial_ledger (id, entry_date, entry_type, category, amount_inr, reference_id, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        `LEDGER_ROUTE_${routeId}`,
        today,
        'EXPENSE_DEBIT',
        'FUEL_COST',
        routePlan.metrics.estimated_fuel_cost_inr,
        routeId,
        `Optimized Collection Route Fuel (${routePlan.metrics.total_distance_km} km for ${routePlan.stops.length} sheds)`
      );
    });

    saveRouteTx();

    res.status(201).json({
      success: true,
      action_required: true,
      route_id: routeId,
      data: {
        id: routeId,
        route_date: today,
        dispatched_vehicle_no: vehicle_no,
        ...routePlan
      }
    });
  } catch (error) {
    console.error('[API Error] Route optimization failed:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/routes
 * Retrieves past collection routes.
 */
router.get('/', (req, res) => {
  try {
    const routes = db.prepare(`
      SELECT * FROM collection_routes
      ORDER BY created_at DESC
      LIMIT 20
    `).all();

    res.json({
      success: true,
      count: routes.length,
      data: routes
    });
  } catch (error) {
    console.error('[API Error] Failed to fetch routes:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /api/routes/latest
 * Fetches the most recent dispatched route with its ordered stops.
 */
router.get('/latest', (req, res) => {
  try {
    const latestRoute = db.prepare(`
      SELECT * FROM collection_routes
      ORDER BY created_at DESC
      LIMIT 1
    `).get();

    if (!latestRoute) {
      return res.json({ success: true, data: null });
    }

    const stops = db.prepare(`
      SELECT s.*, v.name as village_name, v.panchayat_name, v.latitude, v.longitude
      FROM collection_route_stops s
      JOIN villages v ON s.village_id = v.id
      WHERE s.route_id = ?
      ORDER BY s.stop_sequence ASC
    `).all(latestRoute.id);

    // Reconstruct full tour waypoints: Depot -> stops -> Depot
    const tour = [
      CENTRAL_PWMU_DEPOT,
      ...stops,
      CENTRAL_PWMU_DEPOT
    ];

    res.json({
      success: true,
      data: {
        ...latestRoute,
        stops,
        tour
      }
    });
  } catch (error) {
    console.error('[API Error] Failed to fetch latest route:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /api/routes/:id/manifest
 * Generates structured printable driver dispatch manifest.
 */
router.get('/:id/manifest', (req, res) => {
  try {
    const { id } = req.params;
    const route = db.prepare('SELECT * FROM collection_routes WHERE id = ?').get(id);

    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }

    const stops = db.prepare(`
      SELECT s.*, v.name as village_name, v.panchayat_name, v.latitude, v.longitude
      FROM collection_route_stops s
      JOIN villages v ON s.village_id = v.id
      WHERE s.route_id = ?
      ORDER BY s.stop_sequence ASC
    `).all(id);

    res.json({
      success: true,
      manifest: {
        route_id: route.id,
        date: route.route_date,
        vehicle: route.dispatched_vehicle_no,
        depot: CENTRAL_PWMU_DEPOT.name,
        total_distance: `${route.total_distance_km} km`,
        estimated_fuel: `${route.estimated_fuel_liters} Liters`,
        estimated_cost: `₹${route.estimated_fuel_cost_inr}`,
        savings_vs_static: `₹${route.fuel_savings_inr}`,
        carbon_avoided: `${route.co2_savings_kg} kg CO2`,
        itinerary: [
          { sequence: 0, location: CENTRAL_PWMU_DEPOT.name, action: 'Vehicle Departure / Fuel Check' },
          ...stops.map((s) => ({
            sequence: s.stop_sequence,
            location: `${s.village_name} (${s.panchayat_name})`,
            fill_at_dispatch: `${s.village_fill_at_dispatch}%`,
            action: 'Weigh 4 streams & empty shed into vehicle'
          })),
          { sequence: stops.length + 1, location: CENTRAL_PWMU_DEPOT.name, action: 'Depot Return & Waste Unloading at MRF' }
        ]
      }
    });
  } catch (error) {
    console.error('[API Error] Failed to generate manifest:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
