# GramChakra: Complete Extracted Source Code
**Project Title:** Technical Solutions for Multi-Layer Plastic (MLP) Management at PWMU/MRF Level (SBM-G Rural Solid Waste Management)  
**Academic Code Submission Document**

This document contains the complete, unabridged source code for both the `/backend` and `/frontend` modules of the GramChakra platform, organized by component.

---

# Table of Contents
1. [Backend & API Code](#backend--api-code)
   - [backend/server.js](#backendserverjs)
   - [backend/db/database.js](#backenddbdatabasejs)
   - [backend/db/seed.js](#backenddbseedjs)
   - [backend/utils/routeOptimizer.js](#backendutilsrouteoptimizerjs)
   - [backend/routes/villages.js](#backendroutesvillagesjs)
   - [backend/routes/wasteLogs.js](#backendrouteswastelogsjs)
   - [backend/routes/routesOptimizer.js](#backendroutesroutesoptimizerjs)
   - [backend/routes/processing.js](#backendroutesprocessingjs)
   - [backend/routes/marketplace.js](#backendroutesmarketplacejs)
   - [backend/routes/analytics.js](#backendroutesanalyticsjs)
   - [backend/test/routeTest.js](#backendtestroutetestjs)
2. [Frontend Code](#frontend-code)
   - [frontend/vite.config.js](#frontendviteconfigjs)
   - [frontend/src/App.jsx](#frontendsrcappjsx)
   - [frontend/src/utils/offlineQueue.js](#frontendsrcutilsofflinequeuejs)
   - [frontend/src/components/Header.jsx](#frontendsrccomponentsheaderjsx)
   - [frontend/src/components/ClusterMap.jsx](#frontendsrccomponentsclustermapjsx)
   - [frontend/src/components/charts/StreamBreakdownChart.jsx](#frontendsrccomponentschartsstreambreakdownchartjsx)
   - [frontend/src/components/charts/VillageFillChart.jsx](#frontendsrccomponentschartsvillagefillchartjsx)
   - [frontend/src/components/charts/FinancialLedgerChart.jsx](#frontendsrccomponentschartsfinancialledgerchartjsx)
   - [frontend/src/components/charts/ProductInventoryChart.jsx](#frontendsrccomponentschartsproductinventorychartjsx)
   - [frontend/src/components/views/DashboardView.jsx](#frontendsrccomponentsviewsdashboardviewjsx)
   - [frontend/src/components/views/WasteLoggerView.jsx](#frontendsrccomponentsviewswasteloggerviewjsx)
   - [frontend/src/components/views/PWMUProcessingView.jsx](#frontendsrccomponentsviewspwmuprocessingviewjsx)
   - [frontend/src/components/views/MarketplaceView.jsx](#frontendsrccomponentsviewsmarketplaceviewjsx)

---

# Backend & API Code

### `backend/server.js`
```javascript
/**
 * ============================================================================
 * GramChakra Backend - Express Application Gateway
 * ============================================================================
 * File: backend/server.js
 * Description:
 *   Primary REST API server for the GramChakra SBM-G Rural Solid Waste &
 *   Multi-Layer Plastic (MLP) Management System.
 * 
 * Modular Routing:
 *   - /api/villages    : Village cluster aggregation points & shed fill levels
 *   - /api/waste-logs  : 4-stream low-bandwidth waste logger & offline sync
 *   - /api/routes      : Demand-based TSP dynamic vehicle route optimization
 *   - /api/processing  : PWMU batch conversion & raw MLP upcycling tracker
 *   - /api/marketplace : Buyer procurement portal & contractor order engine
 *   - /api/analytics   : Powers the 4 live interactive Recharts dashboards
 * ============================================================================
 */

import express from 'express';
import cors from 'cors';
import { seedDatabase } from './db/seed.js';

// Import modular API route handlers
import villagesRouter from './routes/villages.js';
import wasteLogsRouter from './routes/wasteLogs.js';
import routesOptimizerRouter from './routes/routesOptimizer.js';
import processingRouter from './routes/processing.js';
import marketplaceRouter from './routes/marketplace.js';
import analyticsRouter from './routes/analytics.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger for development transparency
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Root health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'GramChakra SBM-G PWMU Rural SWM Platform',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Mount Modular API Routers
app.use('/api/villages', villagesRouter);
app.use('/api/waste-logs', wasteLogsRouter);
app.use('/api/routes', routesOptimizerRouter);
app.use('/api/processing', processingRouter);
app.use('/api/marketplace', marketplaceRouter);
app.use('/api/analytics', analyticsRouter);

// 404 Handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// Auto-seed database on first startup if tables are empty
try {
  seedDatabase(false);
} catch (seedErr) {
  console.error('[GramChakra Startup Warning] Seed failed:', seedErr);
}

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ==============================================================
   🌿 GramChakra SBM-G MLP Rural Waste Management Platform 🌿
   Server active on: http://localhost:${PORT}
   REST Endpoints:
   • /api/health
   • /api/villages & /api/villages/depot
   • /api/waste-logs & /api/waste-logs/summary
   • /api/routes/optimize & /api/routes/latest
   • /api/processing/stockpile & /api/processing/batches
   • /api/marketplace/products & /api/marketplace/orders
   • /api/analytics/{stream-breakdown, village-fills, monthly-financials, product-inventory, kpis}
  ==============================================================
  `);
});
```

---

### `backend/db/database.js`
```javascript
/**
 * ============================================================================
 * GramChakra Backend - Database Adapter & Schema Initializer
 * ============================================================================
 * Module: backend/db/database.js
 * Description:
 *   Provides a unified, Windows-safe SQLite database adapter with automatic
 *   fallback support. It first attempts to initialize 'better-sqlite3' and,
 *   if native compilation or binary bindings are unavailable on Windows,
 *   gracefully falls back to Node.js built-in 'node:sqlite' (DatabaseSync).
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'pwmu.db');

// Ensure database directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let dbInstance = null;
let dbEngineName = '';

// Attempt initialization: Primary (better-sqlite3) -> Fallback (node:sqlite)
try {
  const { default: Database } = await import('better-sqlite3');
  const rawDb = new Database(DB_FILE);
  rawDb.pragma('journal_mode = WAL');
  rawDb.pragma('foreign_keys = ON');

  dbInstance = {
    prepare(sql) {
      const stmt = rawDb.prepare(sql);
      return {
        all: (...params) => stmt.all(...params),
        get: (...params) => stmt.get(...params),
        run: (...params) => stmt.run(...params)
      };
    },
    exec(sql) {
      return rawDb.exec(sql);
    },
    transaction(fn) {
      return rawDb.transaction(fn);
    }
  };
  dbEngineName = 'better-sqlite3 (Native WAL)';
} catch (betterSqliteErr) {
  try {
    const { DatabaseSync } = await import('node:sqlite');
    const rawDb = new DatabaseSync(DB_FILE);
    rawDb.exec('PRAGMA foreign_keys = ON;');

    dbInstance = {
      prepare(sql) {
        const stmt = rawDb.prepare(sql);
        return {
          all: (...params) => stmt.all(...params),
          get: (...params) => stmt.get(...params),
          run: (...params) => stmt.run(...params)
        };
      },
      exec(sql) {
        return rawDb.exec(sql);
      },
      transaction(fn) {
        return (...args) => {
          rawDb.exec('BEGIN IMMEDIATE TRANSACTION;');
          try {
            const result = fn(...args);
            rawDb.exec('COMMIT;');
            return result;
          } catch (err) {
            rawDb.exec('ROLLBACK;');
            throw err;
          }
        };
      }
    };
    dbEngineName = 'node:sqlite (Built-in Standard Fallback)';
  } catch (nodeSqliteErr) {
    console.error('CRITICAL: Failed to initialize SQLite engine:', betterSqliteErr, nodeSqliteErr);
    throw new Error('No compatible SQLite driver found on this system.');
  }
}

console.log(`[GramChakra DB] Database initialized using ${dbEngineName} at ${DB_FILE}`);

/**
 * Initializes all required tables matching the Mermaid ER diagram 1:1.
 */
export function initSchema() {
  const ddl = `
    -- 1. Villages and Aggregation Sheds
    CREATE TABLE IF NOT EXISTS villages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      panchayat_name TEXT NOT NULL,
      block_name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      current_fill_percent REAL NOT NULL DEFAULT 0.0,
      last_updated_at TEXT NOT NULL
    );

    -- 2. 4-Stream Waste Logs (with client UUID idempotency)
    CREATE TABLE IF NOT EXISTS waste_logs (
      id TEXT PRIMARY KEY,
      client_sync_id TEXT UNIQUE NOT NULL,
      village_id TEXT NOT NULL,
      wet_waste_kg REAL NOT NULL DEFAULT 0.0,
      dry_recyclable_kg REAL NOT NULL DEFAULT 0.0,
      mlp_waste_kg REAL NOT NULL DEFAULT 0.0,
      sanitary_hazardous_kg REAL NOT NULL DEFAULT 0.0,
      recorded_fill_percent REAL NOT NULL,
      logged_by TEXT NOT NULL,
      recorded_at TEXT NOT NULL,
      synced_at TEXT NOT NULL,
      FOREIGN KEY (village_id) REFERENCES villages(id) ON DELETE CASCADE
    );

    -- 3. Dynamic Vehicle Collection Routes
    CREATE TABLE IF NOT EXISTS collection_routes (
      id TEXT PRIMARY KEY,
      route_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPTIMIZED',
      threshold_filter_percent REAL NOT NULL DEFAULT 75.0,
      total_distance_km REAL NOT NULL,
      estimated_fuel_liters REAL NOT NULL,
      estimated_fuel_cost_inr REAL NOT NULL,
      baseline_static_distance_km REAL NOT NULL,
      fuel_savings_inr REAL NOT NULL,
      co2_savings_kg REAL NOT NULL,
      dispatched_vehicle_no TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- 4. Route Stops (Sequential Visits)
    CREATE TABLE IF NOT EXISTS collection_route_stops (
      id TEXT PRIMARY KEY,
      route_id TEXT NOT NULL,
      village_id TEXT NOT NULL,
      stop_sequence INTEGER NOT NULL,
      village_fill_at_dispatch REAL NOT NULL,
      collection_status TEXT NOT NULL DEFAULT 'PENDING',
      FOREIGN KEY (route_id) REFERENCES collection_routes(id) ON DELETE CASCADE,
      FOREIGN KEY (village_id) REFERENCES villages(id) ON DELETE CASCADE
    );

    -- 5. PWMU / MRF Conversion Batches
    CREATE TABLE IF NOT EXISTS processing_batches (
      id TEXT PRIMARY KEY,
      batch_code TEXT UNIQUE NOT NULL,
      product_type TEXT NOT NULL,
      mlp_input_kg REAL NOT NULL,
      aggregate_input_kg REAL NOT NULL,
      units_produced INTEGER NOT NULL,
      electricity_kwh REAL NOT NULL DEFAULT 0.0,
      labor_cost_inr REAL NOT NULL DEFAULT 0.0,
      batch_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'COMPLETED'
    );

    -- 6. Finished Products Stock & Catalog
    CREATE TABLE IF NOT EXISTS finished_products (
      id TEXT PRIMARY KEY,
      product_type TEXT NOT NULL,
      unit_name TEXT NOT NULL,
      stock_units INTEGER NOT NULL DEFAULT 0,
      unit_price_inr REAL NOT NULL,
      min_order_units INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    -- 7. Buyer Orders (Contractor & Panchayat Procurement)
    CREATE TABLE IF NOT EXISTS buyer_orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      buyer_name TEXT NOT NULL,
      buyer_type TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      delivery_address TEXT NOT NULL,
      total_amount_inr REAL NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'PENDING',
      fulfillment_status TEXT NOT NULL DEFAULT 'ORDERED',
      order_date TEXT NOT NULL
    );

    -- 8. Order Items
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price_inr REAL NOT NULL,
      subtotal_inr REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES buyer_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES finished_products(id) ON DELETE CASCADE
    );

    -- 9. O&M Financial Ledger (Sustainability Tracking)
    CREATE TABLE IF NOT EXISTS om_financial_ledger (
      id TEXT PRIMARY KEY,
      entry_date TEXT NOT NULL,
      entry_type TEXT NOT NULL,
      category TEXT NOT NULL,
      amount_inr REAL NOT NULL,
      reference_id TEXT,
      description TEXT NOT NULL
    );
  `;

  dbInstance.exec(ddl);
  console.log('[GramChakra DB] Database DDL schema verified successfully.');
}

// Auto-run schema check
initSchema();

export default dbInstance;
```

---

### `backend/db/seed.js`
```javascript
/**
 * ============================================================================
 * GramChakra Backend - Realistic SBM-G Rural Cluster Data Seeder
 * ============================================================================
 * Module: backend/db/seed.js
 * Context: Swachhata Action Plan - Plastic Waste Management Unit (PWMU)
 * ============================================================================
 */

import db from './database.js';

export function seedDatabase(force = false) {
  const existingVillages = db.prepare('SELECT COUNT(*) as count FROM villages').get();
  if (existingVillages && existingVillages.count > 0 && !force) {
    console.log('[GramChakra Seed] Database already contains records. Skipping auto-seed.');
    return;
  }

  console.log('[GramChakra Seed] Seeding realistic SBM-G rural cluster dataset...');

  const runSeeder = db.transaction(() => {
    if (force) {
      db.exec(`
        DELETE FROM order_items;
        DELETE FROM buyer_orders;
        DELETE FROM om_financial_ledger;
        DELETE FROM processing_batches;
        DELETE FROM finished_products;
        DELETE FROM collection_route_stops;
        DELETE FROM collection_routes;
        DELETE FROM waste_logs;
        DELETE FROM villages;
      `);
    }

    const insertVillage = db.prepare(`
      INSERT INTO villages (id, name, panchayat_name, block_name, latitude, longitude, current_fill_percent, last_updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const villagesData = [
      { id: 'VIL_01', name: 'Rampur Kalan', panchayat: 'Rampur GP', block: 'Phanda Block', lat: 23.2850, lng: 77.4320, fill: 88.0 },
      { id: 'VIL_02', name: 'Shivgarh', panchayat: 'Shivgarh GP', block: 'Phanda Block', lat: 23.2210, lng: 77.3910, fill: 92.0 },
      { id: 'VIL_03', name: 'Barkheda Bondar', panchayat: 'Barkheda GP', block: 'Phanda Block', lat: 23.3100, lng: 77.3750, fill: 78.0 },
      { id: 'VIL_04', name: 'Devnagar', panchayat: 'Devnagar GP', block: 'Phanda Block', lat: 23.2050, lng: 77.4560, fill: 84.0 },
      { id: 'VIL_05', name: 'Anandpur Khurd', panchayat: 'Anandpur GP', block: 'Phanda Block', lat: 23.2920, lng: 77.4810, fill: 76.0 },
      { id: 'VIL_06', name: 'Kalyanpur', panchayat: 'Kalyanpur GP', block: 'Phanda Block', lat: 23.1890, lng: 77.3620, fill: 35.0 },
      { id: 'VIL_07', name: 'Sundarpur', panchayat: 'Sundarpur GP', block: 'Phanda Block', lat: 23.3350, lng: 77.4250, fill: 42.0 },
      { id: 'VIL_08', name: 'Mohanpur', panchayat: 'Mohanpur GP', block: 'Phanda Block', lat: 23.1650, lng: 77.4200, fill: 22.0 },
      { id: 'VIL_09', name: 'Govindgarh', panchayat: 'Govindgarh GP', block: 'Phanda Block', lat: 23.2420, lng: 77.5100, fill: 55.0 },
      { id: 'VIL_10', name: 'Kishanpur', panchayat: 'Kishanpur GP', block: 'Phanda Block', lat: 23.3050, lng: 77.5300, fill: 48.0 }
    ];

    for (const v of villagesData) {
      insertVillage.run(v.id, v.name, v.panchayat, v.block, v.lat, v.lng, v.fill, new Date().toISOString());
    }

    const insertWasteLog = db.prepare(`
      INSERT INTO waste_logs (
        id, client_sync_id, village_id, wet_waste_kg, dry_recyclable_kg, 
        mlp_waste_kg, sanitary_hazardous_kg, recorded_fill_percent, logged_by, recorded_at, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const dootNames = ['Ramesh Sharma (Swachhata Doot)', 'Anita Bai (SHG Lead)', 'Suresh Patel (VLE)', 'Geeta Verma (Doot)'];

    for (let day = 30; day >= 0; day -= 2) {
      const logDate = new Date(Date.now() - day * 24 * 60 * 60 * 1000).toISOString();
      for (const v of villagesData) {
        const wet = Math.round(45 + Math.random() * 50);
        const dry = Math.round(25 + Math.random() * 30);
        const mlp = Math.round(18 + Math.random() * 25);
        const san = Math.round(5 + Math.random() * 8);
        const fill = Math.min(100, Math.round(20 + Math.random() * 75));
        const doot = dootNames[Math.floor(Math.random() * dootNames.length)];

        insertWasteLog.run(
          `LOG_${day}_${v.id}`,
          `SYNC_UUID_${day}_${v.id}`,
          v.id,
          wet,
          dry,
          mlp,
          san,
          fill,
          doot,
          logDate,
          logDate
        );
      }
    }

    const insertProduct = db.prepare(`
      INSERT INTO finished_products (id, product_type, unit_name, stock_units, unit_price_inr, min_order_units, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertProduct.run('PROD_PAVER', 'PAVER_BLOCK', 'Piece', 1850, 45.0, 50, new Date().toISOString());
    insertProduct.run('PROD_FENCE', 'FENCING_POST', '6ft Post', 420, 320.0, 10, new Date().toISOString());
    insertProduct.run('PROD_ROOF', 'ROOF_TILE', 'Interlocking Tile', 920, 180.0, 20, new Date().toISOString());

    const insertBatch = db.prepare(`
      INSERT INTO processing_batches (
        id, batch_code, product_type, mlp_input_kg, aggregate_input_kg, 
        units_produced, electricity_kwh, labor_cost_inr, batch_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const batches = [
      { id: 'BATCH_001', code: 'BATCH-2026-PB01', type: 'PAVER_BLOCK', mlp: 450.0, agg: 1350.0, units: 1350, kwh: 120.0, labor: 2400.0, date: '2026-10-15' },
      { id: 'BATCH_002', code: 'BATCH-2026-FP01', type: 'FENCING_POST', mlp: 600.0, agg: 1200.0, units: 150, kwh: 160.0, labor: 3200.0, date: '2026-10-28' },
      { id: 'BATCH_003', code: 'BATCH-2026-RT01', type: 'ROOF_TILE', mlp: 500.0, agg: 830.0, units: 330, kwh: 140.0, labor: 2800.0, date: '2026-11-08' },
      { id: 'BATCH_004', code: 'BATCH-2026-PB02', type: 'PAVER_BLOCK', mlp: 700.0, agg: 2100.0, units: 2100, kwh: 180.0, labor: 3600.0, date: '2026-11-18' }
    ];

    for (const b of batches) {
      insertBatch.run(b.id, b.code, b.type, b.mlp, b.agg, b.units, b.kwh, b.labor, b.date, 'COMPLETED');
    }

    const insertOrder = db.prepare(`
      INSERT INTO buyer_orders (
        id, order_number, buyer_name, buyer_type, contact_phone, 
        delivery_address, total_amount_inr, payment_status, fulfillment_status, order_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertOrderItem = db.prepare(`
      INSERT INTO order_items (id, order_id, product_id, quantity, unit_price_inr, subtotal_inr)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertOrder.run('ORD_001', 'ORD-2026-001', 'Rampur Gram Panchayat (MGNREGA Pavement Project)', 'GRAM_PANCHAYAT', '+91 98261 44550', 'Village Rampur Kalan Internal CC Road Site', 36000.0, 'PAID', 'DELIVERED', '2026-10-20');
    insertOrderItem.run('ITEM_001', 'ORD_001', 'PROD_PAVER', 800, 45.0, 36000.0);

    insertOrder.run('ORD_002', 'ORD-2026-002', 'Om Prakash Yadav (Horticulture Farm)', 'PRIVATE_FARMER', '+91 94250 88912', 'Shivgarh Boundary Enclosure Site', 25600.0, 'PAID', 'DELIVERED', '2026-11-02');
    insertOrderItem.run('ITEM_002', 'ORD_002', 'PROD_FENCE', 80, 320.0, 25600.0);

    insertOrder.run('ORD_003', 'ORD-2026-003', 'Shree Balaji PWD Road Contractor', 'PWD_CONTRACTOR', '+91 97552 11043', 'Devnagar Approach Road Drainage Pavement', 54000.0, 'PENDING', 'ORDERED', '2026-11-20');
    insertOrderItem.run('ITEM_003', 'ORD_003', 'PROD_PAVER', 1200, 45.0, 54000.0);

    const insertLedger = db.prepare(`
      INSERT INTO om_financial_ledger (id, entry_date, entry_type, category, amount_inr, reference_id, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const ledgerMonths = [
      { month: '2026-06', revenue: 68500, fuel: 14200, wages: 24000, elec: 7800 },
      { month: '2026-07', revenue: 74200, fuel: 15100, wages: 24000, elec: 8200 },
      { month: '2026-08', revenue: 82000, fuel: 13800, wages: 25000, elec: 8600 },
      { month: '2026-09', revenue: 89400, fuel: 12900, wages: 25000, elec: 9100 },
      { month: '2026-10', revenue: 104500, fuel: 11400, wages: 26000, elec: 10200 },
      { month: '2026-11', revenue: 115600, fuel: 10800, wages: 26000, elec: 10800 }
    ];

    let ledgerIndex = 1;
    for (const m of ledgerMonths) {
      insertLedger.run(`LEDGER_${ledgerIndex++}`, `${m.month}-25`, 'REVENUE_CREDIT', 'PRODUCT_SALES', m.revenue * 0.75, `ORD_BATCH_${m.month}`, `Monthly sales of recycled Paver Blocks & Fencing Posts for ${m.month}`);
      insertLedger.run(`LEDGER_${ledgerIndex++}`, `${m.month}-28`, 'REVENUE_CREDIT', 'RECYCLABLES_SCRAP', m.revenue * 0.25, `SCRAP_SALE_${m.month}`, `Sale of sorted PET bottles, cardboard, and metal scrap to registered recyclers`);
      insertLedger.run(`LEDGER_${ledgerIndex++}`, `${m.month}-15`, 'EXPENSE_DEBIT', 'FUEL_COST', m.fuel, `FUEL_VOUCHER_${m.month}`, `Diesel expenditure for waste collection vehicle (Optimized Dynamic Routing)`);
      insertLedger.run(`LEDGER_${ledgerIndex++}`, `${m.month}-05`, 'EXPENSE_DEBIT', 'OPERATOR_WAGES', m.wages, `PAYROLL_${m.month}`, `Monthly wages for vehicle driver and 2 PWMU shredder/molding operators`);
      insertLedger.run(`LEDGER_${ledgerIndex++}`, `${m.month}-10`, 'EXPENSE_DEBIT', 'ELECTRICITY', m.elec, `ELEC_BILL_${m.month}`, `Industrial 3-phase electricity consumption for shredder, agglomerator & heat press`);
    }
  });

  runSeeder();
  console.log('[GramChakra Seed] Successfully seeded villages, waste logs, batches, orders, and 6-month financial ledger.');
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase(true);
}
```

---

### `backend/utils/routeOptimizer.js`
```javascript
/**
 * ============================================================================
 * GramChakra Backend - Demand-Based Dynamic Route Optimization Engine
 * ============================================================================
 * Module: backend/utils/routeOptimizer.js
 * Context: SBM-G Phase II Rural Waste Management & O&M Cost Minimization
 * ============================================================================
 */

const EARTH_RADIUS_KM = 6371.0;
const DIESEL_KM_PER_LITER = 4.5;
const DIESEL_PRICE_PER_LITER_INR = 92.0;
const CO2_KG_PER_LITER = 2.68;

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

export function filterEligibleVillages(villages, thresholdPercent = 75.0) {
  return villages.filter((v) => Number(v.current_fill_percent) >= Number(thresholdPercent));
}

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

  tour.push(depot);
  return tour;
}

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

export function apply2Opt(tour) {
  if (!tour || tour.length <= 3) {
    return tour;
  }

  let route = [...tour];
  let improved = true;
  let iterations = 0;
  const MAX_ITERATIONS = 50;

  while (improved && iterations < MAX_ITERATIONS) {
    improved = false;
    iterations++;

    for (let i = 1; i < route.length - 2; i++) {
      for (let k = i + 1; k < route.length - 1; k++) {
        const d1 = haversineDistance(route[i - 1].latitude, route[i - 1].longitude, route[i].latitude, route[i].longitude);
        const d2 = haversineDistance(route[k].latitude, route[k].longitude, route[k + 1].latitude, route[k + 1].longitude);

        const newD1 = haversineDistance(route[i - 1].latitude, route[i - 1].longitude, route[k].latitude, route[k].longitude);
        const newD2 = haversineDistance(route[i].latitude, route[i].longitude, route[k + 1].latitude, route[k + 1].longitude);

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

export function calculateRouteMetrics(dynamicDistanceKm, staticBaselineKm) {
  const dynamicDistance = Math.max(0, Number(dynamicDistanceKm) || 0);
  const staticDistance = Math.max(dynamicDistance, Number(staticBaselineKm) || 0);

  const estimatedFuelLiters = dynamicDistance / DIESEL_KM_PER_LITER;
  const estimatedFuelCostInr = estimatedFuelLiters * DIESEL_PRICE_PER_LITER_INR;

  const baselineFuelLiters = staticDistance / DIESEL_KM_PER_LITER;
  const baselineFuelCostInr = baselineFuelLiters * DIESEL_PRICE_PER_LITER_INR;

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

export function generateOptimizedPickupRoute(depot, allVillages, thresholdPercent = 75.0) {
  const staticTour = [depot, ...allVillages, depot];
  const staticBaselineKm = calculateTourDistance(staticTour);

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

  const nnTour = solveNearestNeighbor(depot, eligibleVillages);
  const optimizedTour = apply2Opt(nnTour);
  const dynamicDistanceKm = calculateTourDistance(optimizedTour);
  const metrics = calculateRouteMetrics(dynamicDistanceKm, staticBaselineKm);

  const stops = optimizedTour
    .slice(1, -1)
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
```

---

### `backend/routes/villages.js`
```javascript
import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

export const CENTRAL_PWMU_DEPOT = {
  id: 'DEPOT_00',
  name: 'Central PWMU Block Processing Depot',
  panchayat_name: 'Block HQ Cluster',
  block_name: 'Phanda Block',
  latitude: 23.2599,
  longitude: 77.4126,
  current_fill_percent: 0.0,
  type: 'DEPOT'
};

router.get('/', (req, res) => {
  try {
    const villages = db.prepare(`
      SELECT id, name, panchayat_name, block_name, latitude, longitude, 
             current_fill_percent, last_updated_at
      FROM villages
      ORDER BY current_fill_percent DESC
    `).all();

    res.json({ success: true, count: villages.length, data: villages });
  } catch (error) {
    console.error('[API Error] Failed to fetch villages:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/depot', (req, res) => {
  res.json({ success: true, data: CENTRAL_PWMU_DEPOT });
});

router.patch('/:id/fill', (req, res) => {
  try {
    const { id } = req.params;
    const { fill_percent } = req.body;

    if (fill_percent === undefined || fill_percent < 0 || fill_percent > 100) {
      return res.status(400).json({ success: false, message: 'Invalid fill_percent. Must be between 0 and 100.' });
    }

    const now = new Date().toISOString();
    const result = db.prepare(`
      UPDATE villages 
      SET current_fill_percent = ?, last_updated_at = ?
      WHERE id = ?
    `).run(Number(fill_percent), now, id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Village not found' });
    }

    const updated = db.prepare('SELECT * FROM villages WHERE id = ?').get(id);
    res.json({ success: true, message: `Updated ${updated.name} shed fill to ${fill_percent}%`, data: updated });
  } catch (error) {
    console.error('[API Error] Failed to update fill level:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
```

---

### `backend/routes/wasteLogs.js`
```javascript
import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

function recordWasteLogTx(payload) {
  const {
    client_sync_id,
    village_id,
    wet_waste_kg = 0,
    dry_recyclable_kg = 0,
    mlp_waste_kg = 0,
    sanitary_hazardous_kg = 0,
    recorded_fill_percent,
    logged_by = 'Swachhata Doot',
    recorded_at = new Date().toISOString()
  } = payload;

  if (!village_id || recorded_fill_percent === undefined) {
    throw new Error('village_id and recorded_fill_percent are required.');
  }

  const existing = db.prepare('SELECT * FROM waste_logs WHERE client_sync_id = ?').get(client_sync_id);
  if (existing) {
    return { log: existing, isDuplicate: true };
  }

  const id = `LOG_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const synced_at = new Date().toISOString();

  db.prepare(`
    INSERT INTO waste_logs (
      id, client_sync_id, village_id, wet_waste_kg, dry_recyclable_kg,
      mlp_waste_kg, sanitary_hazardous_kg, recorded_fill_percent, logged_by, recorded_at, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    client_sync_id || `SYNC_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    village_id,
    Number(wet_waste_kg) || 0,
    Number(dry_recyclable_kg) || 0,
    Number(mlp_waste_kg) || 0,
    Number(sanitary_hazardous_kg) || 0,
    Number(recorded_fill_percent),
    logged_by,
    recorded_at,
    synced_at
  );

  db.prepare(`
    UPDATE villages
    SET current_fill_percent = ?, last_updated_at = ?
    WHERE id = ?
  `).run(Number(recorded_fill_percent), recorded_at, village_id);

  const inserted = db.prepare('SELECT * FROM waste_logs WHERE id = ?').get(id);
  return { log: inserted, isDuplicate: false };
}

router.post('/', (req, res) => {
  try {
    const runTx = db.transaction(() => recordWasteLogTx(req.body));
    const result = runTx();

    res.status(result.isDuplicate ? 200 : 201).json({
      success: true,
      message: result.isDuplicate ? 'Log already synced (idempotent)' : 'Waste log recorded successfully',
      data: result.log
    });
  } catch (error) {
    console.error('[API Error] Failed to record waste log:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/batch-sync', (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or empty items array' });
    }

    const runBatchTx = db.transaction(() => {
      const processed = [];
      for (const item of items) {
        const result = recordWasteLogTx(item);
        processed.push(result.log);
      }
      return processed;
    });

    const syncedRecords = runBatchTx();
    res.json({
      success: true,
      message: `Successfully flushed and synced ${syncedRecords.length} offline waste logs.`,
      count: syncedRecords.length,
      data: syncedRecords
    });
  } catch (error) {
    console.error('[API Error] Batch sync failed:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/', (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT w.*, v.name as village_name, v.panchayat_name
      FROM waste_logs w
      JOIN villages v ON w.village_id = v.id
      ORDER BY w.recorded_at DESC
      LIMIT 50
    `).all();

    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    console.error('[API Error] Failed to fetch waste logs:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/summary', (req, res) => {
  try {
    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(wet_waste_kg), 0) as total_wet_kg,
        COALESCE(SUM(dry_recyclable_kg), 0) as total_dry_kg,
        COALESCE(SUM(mlp_waste_kg), 0) as total_mlp_kg,
        COALESCE(SUM(sanitary_hazardous_kg), 0) as total_sanitary_kg,
        COUNT(*) as total_logs_count
      FROM waste_logs
    `).get();

    res.json({
      success: true,
      data: {
        total_wet_kg: Number(summary.total_wet_kg.toFixed(1)),
        total_dry_kg: Number(summary.total_dry_kg.toFixed(1)),
        total_mlp_kg: Number(summary.total_mlp_kg.toFixed(1)),
        total_sanitary_kg: Number(summary.total_sanitary_kg.toFixed(1)),
        total_waste_kg: Number((summary.total_wet_kg + summary.total_dry_kg + summary.total_mlp_kg + summary.total_sanitary_kg).toFixed(1)),
        total_logs_count: summary.total_logs_count
      }
    });
  } catch (error) {
    console.error('[API Error] Failed to fetch waste summary:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
```

---

### `backend/routes/routesOptimizer.js`
```javascript
import { Router } from 'express';
import db from '../db/database.js';
import { CENTRAL_PWMU_DEPOT } from './villages.js';
import { generateOptimizedPickupRoute } from '../utils/routeOptimizer.js';

const router = Router();

router.post('/optimize', (req, res) => {
  try {
    const {
      threshold = 75.0,
      vehicle_no = 'MP-04-GA-4501 (Tata Ace SBM-G Tipper)'
    } = req.body;

    const allVillages = db.prepare('SELECT * FROM villages').all();
    if (!allVillages || allVillages.length === 0) {
      return res.status(400).json({ success: false, message: 'No villages found in database' });
    }

    const routePlan = generateOptimizedPickupRoute(
      CENTRAL_PWMU_DEPOT,
      allVillages,
      Number(threshold)
    );

    if (routePlan.status === 'NO_ACTION_REQUIRED') {
      return res.json({
        success: true,
        action_required: false,
        message: routePlan.message,
        data: routePlan
      });
    }

    const routeId = `RT_${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const saveRouteTx = db.transaction(() => {
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

router.get('/', (req, res) => {
  try {
    const routes = db.prepare(`
      SELECT * FROM collection_routes
      ORDER BY created_at DESC
      LIMIT 20
    `).all();

    res.json({ success: true, count: routes.length, data: routes });
  } catch (error) {
    console.error('[API Error] Failed to fetch routes:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

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

    const tour = [
      CENTRAL_PWMU_DEPOT,
      ...stops,
      CENTRAL_PWMU_DEPOT
    ];

    res.json({ success: true, data: { ...latestRoute, stops, tour } });
  } catch (error) {
    console.error('[API Error] Failed to fetch latest route:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

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
```

---

### `backend/routes/processing.js`
```javascript
import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

export const CONVERSION_RECIPES = {
  PAVER_BLOCK: {
    name: 'Heavy-Duty Paver Block',
    productId: 'PROD_PAVER',
    mlpPerUnit: 0.333,
    aggregateRatio: 3.0,
    unitPrice: 45.0,
    unitName: 'Piece'
  },
  FENCING_POST: {
    name: 'Reinforced 6ft Fencing Post',
    productId: 'PROD_FENCE',
    mlpPerUnit: 4.0,
    aggregateRatio: 2.0,
    unitPrice: 320.0,
    unitName: '6ft Post'
  },
  ROOF_TILE: {
    name: 'Interlocking Composite Roof Tile',
    productId: 'PROD_ROOF',
    mlpPerUnit: 1.5,
    aggregateRatio: 1.67,
    unitPrice: 180.0,
    unitName: 'Interlocking Tile'
  }
};

router.get('/stockpile', (req, res) => {
  try {
    const collected = db.prepare('SELECT COALESCE(SUM(mlp_waste_kg), 0) as total_collected_mlp FROM waste_logs').get();
    const consumed = db.prepare('SELECT COALESCE(SUM(mlp_input_kg), 0) as total_consumed_mlp FROM processing_batches').get();

    const totalCollected = Number(collected.total_collected_mlp);
    const totalConsumed = Number(consumed.total_consumed_mlp);
    const availableStockpile = Math.max(0, totalCollected - totalConsumed);

    res.json({
      success: true,
      data: {
        total_collected_mlp_kg: Number(totalCollected.toFixed(1)),
        total_consumed_mlp_kg: Number(totalConsumed.toFixed(1)),
        available_stockpile_kg: Number(availableStockpile.toFixed(1))
      }
    });
  } catch (error) {
    console.error('[API Error] Failed to calculate stockpile:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/batches', (req, res) => {
  try {
    const batches = db.prepare('SELECT * FROM processing_batches ORDER BY batch_date DESC').all();
    res.json({ success: true, count: batches.length, data: batches });
  } catch (error) {
    console.error('[API Error] Failed to fetch batches:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/batches', (req, res) => {
  try {
    const {
      product_type,
      mlp_input_kg,
      electricity_kwh = 120.0,
      labor_cost_inr = 2400.0,
      batch_date = new Date().toISOString().split('T')[0]
    } = req.body;

    const recipe = CONVERSION_RECIPES[product_type];
    if (!recipe) {
      return res.status(400).json({
        success: false,
        message: `Invalid product_type. Must be one of: ${Object.keys(CONVERSION_RECIPES).join(', ')}`
      });
    }

    const inputMlp = Number(mlp_input_kg);
    if (!inputMlp || inputMlp <= 0) {
      return res.status(400).json({ success: false, message: 'mlp_input_kg must be greater than zero.' });
    }

    const collected = db.prepare('SELECT COALESCE(SUM(mlp_waste_kg), 0) as total FROM waste_logs').get();
    const consumed = db.prepare('SELECT COALESCE(SUM(mlp_input_kg), 0) as total FROM processing_batches').get();
    const available = collected.total - consumed.total;

    if (inputMlp > available) {
      return res.status(400).json({
        success: false,
        message: `Insufficient MLP stockpile. Requested ${inputMlp} kg, but only ${available.toFixed(1)} kg available.`
      });
    }

    const aggregateInputKg = Number((inputMlp * recipe.aggregateRatio).toFixed(1));
    const unitsProduced = Math.floor(inputMlp / recipe.mlpPerUnit);
    const batchId = `BATCH_${Date.now()}`;
    const batchCode = `BATCH-${new Date().getFullYear()}-${product_type.substring(0, 2)}${Math.floor(100 + Math.random() * 900)}`;

    const runBatchTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO processing_batches (
          id, batch_code, product_type, mlp_input_kg, aggregate_input_kg,
          units_produced, electricity_kwh, labor_cost_inr, batch_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        batchId,
        batchCode,
        product_type,
        inputMlp,
        aggregateInputKg,
        unitsProduced,
        Number(electricity_kwh),
        Number(labor_cost_inr),
        batch_date,
        'COMPLETED'
      );

      db.prepare(`
        UPDATE finished_products
        SET stock_units = stock_units + ?, updated_at = ?
        WHERE id = ?
      `).run(unitsProduced, new Date().toISOString(), recipe.productId);

      const totalOpCost = Number(labor_cost_inr) + Number(electricity_kwh) * 8.5;
      db.prepare(`
        INSERT INTO om_financial_ledger (id, entry_date, entry_type, category, amount_inr, reference_id, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        `LEDGER_BATCH_${batchId}`,
        batch_date,
        'EXPENSE_DEBIT',
        'OPERATOR_WAGES',
        totalOpCost,
        batchCode,
        `Processing O&M: ${unitsProduced} ${recipe.unitName} produced from ${inputMlp}kg MLP`
      );
    });

    runBatchTx();

    const createdBatch = db.prepare('SELECT * FROM processing_batches WHERE id = ?').get(batchId);
    const updatedStock = db.prepare('SELECT * FROM finished_products WHERE id = ?').get(recipe.productId);

    res.status(201).json({
      success: true,
      message: `Batch ${batchCode} completed: Converted ${inputMlp} kg MLP into ${unitsProduced} units of ${recipe.name}`,
      data: { batch: createdBatch, current_product_stock: updatedStock }
    });
  } catch (error) {
    console.error('[API Error] Failed to process batch:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/products', (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM finished_products').all();
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('[API Error] Failed to fetch products:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
```

---

### `backend/routes/marketplace.js`
```javascript
import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

router.get('/products', (req, res) => {
  try {
    const products = db.prepare(`
      SELECT id, product_type, unit_name, stock_units, unit_price_inr, min_order_units, updated_at
      FROM finished_products
    `).all();

    res.json({ success: true, count: products.length, data: products });
  } catch (error) {
    console.error('[API Error] Failed to fetch marketplace products:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/orders', (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM buyer_orders ORDER BY order_date DESC').all();

    const getItems = db.prepare(`
      SELECT i.*, p.product_type, p.unit_name
      FROM order_items i
      JOIN finished_products p ON i.product_id = p.id
      WHERE i.order_id = ?
    `);

    const enrichedOrders = orders.map((order) => ({
      ...order,
      items: getItems.all(order.id)
    }));

    res.json({ success: true, count: enrichedOrders.length, data: enrichedOrders });
  } catch (error) {
    console.error('[API Error] Failed to fetch orders:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/orders', (req, res) => {
  try {
    const { buyer_name, buyer_type = 'GRAM_PANCHAYAT', contact_phone, delivery_address, items } = req.body;

    if (!buyer_name || !contact_phone || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'buyer_name, contact_phone, and a non-empty items array are required.' });
    }

    const orderId = `ORD_${Date.now()}`;
    const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const today = new Date().toISOString().split('T')[0];

    const placeOrderTx = db.transaction(() => {
      let totalAmount = 0.0;
      const verifiedItems = [];

      for (const item of items) {
        const product = db.prepare('SELECT * FROM finished_products WHERE id = ?').get(item.product_id);
        if (!product) throw new Error(`Product not found: ${item.product_id}`);

        const qty = Number(item.quantity);
        if (!qty || qty <= 0) throw new Error(`Invalid quantity for product ${product.product_type}`);

        if (product.stock_units < qty) {
          throw new Error(`Insufficient stock for ${product.product_type}. Requested ${qty}, available ${product.stock_units}`);
        }

        const subtotal = qty * product.unit_price_inr;
        totalAmount += subtotal;

        verifiedItems.push({
          productId: product.id,
          productType: product.product_type,
          quantity: qty,
          unitPrice: product.unit_price_inr,
          subtotal
        });
      }

      db.prepare(`
        INSERT INTO buyer_orders (
          id, order_number, buyer_name, buyer_type, contact_phone,
          delivery_address, total_amount_inr, payment_status, fulfillment_status, order_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(orderId, orderNumber, buyer_name, buyer_type, contact_phone, delivery_address || 'Panchayat Yard', totalAmount, 'PAID', 'ORDERED', today);

      const insertItem = db.prepare(`
        INSERT INTO order_items (id, order_id, product_id, quantity, unit_price_inr, subtotal_inr)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const decrementStock = db.prepare(`
        UPDATE finished_products
        SET stock_units = stock_units - ?, updated_at = ?
        WHERE id = ?
      `);

      for (let i = 0; i < verifiedItems.length; i++) {
        const v = verifiedItems[i];
        insertItem.run(`ITEM_${orderId}_${i + 1}`, orderId, v.productId, v.quantity, v.unitPrice, v.subtotal);
        decrementStock.run(v.quantity, new Date().toISOString(), v.productId);
      }

      db.prepare(`
        INSERT INTO om_financial_ledger (id, entry_date, entry_type, category, amount_inr, reference_id, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(`LEDGER_SALE_${orderId}`, today, 'REVENUE_CREDIT', 'PRODUCT_SALES', totalAmount, orderNumber, `Recycled Product Sales to ${buyer_name} (${orderNumber})`);

      return { totalAmount, count: verifiedItems.length };
    });

    const result = placeOrderTx();
    res.status(201).json({
      success: true,
      message: `Order ${orderNumber} placed successfully! Total invoice: ₹${result.totalAmount.toLocaleString('en-IN')}`,
      data: { order_id: orderId, order_number: orderNumber, total_amount_inr: result.totalAmount }
    });
  } catch (error) {
    console.error('[API Error] Failed to place order:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
```

---

### `backend/routes/analytics.js`
```javascript
import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

router.get('/stream-breakdown', (req, res) => {
  try {
    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(wet_waste_kg), 0) as wet,
        COALESCE(SUM(dry_recyclable_kg), 0) as dry,
        COALESCE(SUM(mlp_waste_kg), 0) as mlp,
        COALESCE(SUM(sanitary_hazardous_kg), 0) as sanitary
      FROM waste_logs
    `).get();

    const chartData = [
      { name: 'Wet Waste (Organic)', key: 'wet', value: Number(summary.wet.toFixed(1)), fill: '#10B981', color: '#10B981' },
      { name: 'Dry Recyclables (PET/Metal)', key: 'dry', value: Number(summary.dry.toFixed(1)), fill: '#3B82F6', color: '#3B82F6' },
      { name: 'Multi-Layer Plastic (MLP)', key: 'mlp', value: Number(summary.mlp.toFixed(1)), fill: '#F59E0B', color: '#F59E0B' },
      { name: 'Sanitary & Hazardous', key: 'sanitary', value: Number(summary.sanitary.toFixed(1)), fill: '#EF4444', color: '#EF4444' }
    ];

    const totalKg = chartData.reduce((acc, curr) => acc + curr.value, 0);
    res.json({ success: true, total_kg: Number(totalKg.toFixed(1)), data: chartData });
  } catch (error) {
    console.error('[API Error] Stream breakdown failed:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/village-fills', (req, res) => {
  try {
    const villages = db.prepare(`
      SELECT id, name, panchayat_name, current_fill_percent,
             CASE WHEN current_fill_percent >= 75.0 THEN 1 ELSE 0 END as is_critical
      FROM villages
      ORDER BY current_fill_percent DESC
    `).all();

    const chartData = villages.map((v) => ({
      village_id: v.id,
      name: v.name,
      panchayat: v.panchayat_name,
      fill_percent: Number(v.current_fill_percent),
      is_critical: Boolean(v.is_critical),
      bar_color: v.current_fill_percent >= 75 ? '#DC2626' : v.current_fill_percent >= 50 ? '#F59E0B' : '#10B981'
    }));

    res.json({
      success: true,
      threshold: 75.0,
      critical_count: chartData.filter((d) => d.fill_percent >= 75).length,
      data: chartData
    });
  } catch (error) {
    console.error('[API Error] Village fills failed:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/monthly-financials', (req, res) => {
  try {
    const rawLedger = db.prepare(`
      SELECT 
        substr(entry_date, 1, 7) as month,
        entry_type,
        SUM(amount_inr) as total_amount
      FROM om_financial_ledger
      GROUP BY month, entry_type
      ORDER BY month ASC
    `).all();

    const monthMap = {};
    for (const row of rawLedger) {
      if (!monthMap[row.month]) {
        monthMap[row.month] = { month: row.month, revenue_inr: 0, expenses_inr: 0, net_margin_inr: 0 };
      }
      if (row.entry_type === 'REVENUE_CREDIT') {
        monthMap[row.month].revenue_inr += Number(row.total_amount);
      } else if (row.entry_type === 'EXPENSE_DEBIT') {
        monthMap[row.month].expenses_inr += Number(row.total_amount);
      }
    }

    const chartData = Object.values(monthMap).map((m) => {
      const revenue = Math.round(m.revenue_inr);
      const expenses = Math.round(m.expenses_inr);
      const netMargin = revenue - expenses;
      return {
        month: m.month,
        revenue_inr: revenue,
        expenses_inr: expenses,
        net_margin_inr: netMargin,
        cost_recovery_percent: expenses > 0 ? Math.round((revenue / expenses) * 100) : 100
      };
    });

    res.json({ success: true, months_count: chartData.length, data: chartData });
  } catch (error) {
    console.error('[API Error] Financial analytics failed:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/product-inventory', (req, res) => {
  try {
    const products = db.prepare(`
      SELECT id, product_type, unit_name, stock_units, unit_price_inr,
             (stock_units * unit_price_inr) as inventory_value_inr
      FROM finished_products
      ORDER BY stock_units DESC
    `).all();

    const chartData = products.map((p) => {
      let displayName = p.product_type;
      let barFill = '#3B82F6';
      if (p.product_type === 'PAVER_BLOCK') {
        displayName = 'Paver Blocks (Pieces)';
        barFill = '#F59E0B';
      } else if (p.product_type === 'FENCING_POST') {
        displayName = 'Fencing Posts (6ft Units)';
        barFill = '#10B981';
      } else if (p.product_type === 'ROOF_TILE') {
        displayName = 'Roof Tiles (Units)';
        barFill = '#6366F1';
      }

      return {
        id: p.id,
        product_type: p.product_type,
        displayName,
        stock_units: p.stock_units,
        unit_price_inr: p.unit_price_inr,
        inventory_value_inr: Math.round(p.inventory_value_inr),
        fill: barFill
      };
    });

    res.json({ success: true, data: chartData });
  } catch (error) {
    console.error('[API Error] Product inventory failed:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/kpis', (req, res) => {
  try {
    const wasteSummary = db.prepare(`
      SELECT 
        COALESCE(SUM(wet_waste_kg + dry_recyclable_kg + mlp_waste_kg + sanitary_hazardous_kg), 0) as total_waste_kg,
        COALESCE(SUM(mlp_waste_kg), 0) as total_mlp_kg
      FROM waste_logs
    `).get();

    const routeSavings = db.prepare(`
      SELECT 
        COALESCE(SUM(fuel_savings_inr), 0) as total_fuel_savings_inr,
        COALESCE(SUM(co2_savings_kg), 0) as total_co2_savings_kg,
        COUNT(*) as total_routes_optimized
      FROM collection_routes
    `).get();

    const financials = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN entry_type = 'REVENUE_CREDIT' THEN amount_inr ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN entry_type = 'EXPENSE_DEBIT' THEN amount_inr ELSE 0 END), 0) as total_expenses
      FROM om_financial_ledger
    `).get();

    const production = db.prepare(`
      SELECT 
        COALESCE(SUM(units_produced), 0) as total_units_produced,
        COUNT(*) as total_batches_run
      FROM processing_batches
    `).get();

    const criticalSheds = db.prepare(`
      SELECT COUNT(*) as count FROM villages WHERE current_fill_percent >= 75.0
    `).get();

    const costRecoveryPercent = financials.total_expenses > 0
      ? Math.round((financials.total_revenue / financials.total_expenses) * 100)
      : 100;

    res.json({
      success: true,
      data: {
        total_waste_collected_kg: Math.round(wasteSummary.total_waste_kg),
        total_mlp_diverted_kg: Math.round(wasteSummary.total_mlp_kg),
        total_fuel_savings_inr: Math.round(routeSavings.total_fuel_savings_inr),
        total_co2_saved_kg: Math.round(routeSavings.total_co2_saved_kg),
        total_routes_optimized: routeSavings.total_routes_optimized,
        total_revenue_inr: Math.round(financials.total_revenue),
        total_expenses_inr: Math.round(financials.total_expenses),
        net_financial_margin_inr: Math.round(financials.total_revenue - financials.total_expenses),
        cost_recovery_percent: costRecoveryPercent,
        total_units_manufactured: production.total_units_produced,
        critical_sheds_needing_pickup: criticalSheds.count
      }
    });
  } catch (error) {
    console.error('[API Error] KPI metrics failed:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
```

---

### `backend/test/routeTest.js`
```javascript
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
    { id: 'V4', name: 'Barkheda', current_fill_percent: 75.0 },
    { id: 'V5', name: 'Kalyanpur', current_fill_percent: 74.9 }
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
  const dynamicDist = 45.0;
  const staticDist = 90.0;

  const metrics = calculateRouteMetrics(dynamicDist, staticDist);
  console.log('[TEST 4] Economic & Carbon Metrics Computed:');
  console.log(`  • Dynamic Route Distance: ${metrics.total_distance_km} km`);
  console.log(`  • Baseline Static Route:  ${metrics.baseline_static_distance_km} km`);
  console.log(`  • Distance Saved:         ${metrics.distance_saved_km} km`);
  console.log(`  • Fuel Consumed:          ${metrics.estimated_fuel_liters} L (Cost: ₹${metrics.estimated_fuel_cost_inr})`);
  console.log(`  • Fuel Saved:             ${metrics.fuel_savings_liters} L (Savings: ₹${metrics.fuel_savings_inr})`);
  console.log(`  • CO2 Avoided:            ${metrics.co2_savings_kg} kg CO2`);

  assert.strictEqual(metrics.estimated_fuel_liters, 10.0);
  assert.strictEqual(metrics.estimated_fuel_cost_inr, 920.0);
  assert.strictEqual(metrics.fuel_savings_inr, 920.0);
  assert.strictEqual(metrics.co2_savings_kg, 26.8);
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
  assert.strictEqual(result.eligible_count, 5);
  assert.strictEqual(result.stops.length, 5);
  assert.strictEqual(result.tour[0].id, depot.id);
  assert.strictEqual(result.tour[result.tour.length - 1].id, depot.id);
  assert(result.metrics.fuel_savings_inr > 0);
  testsPassed++;
  console.log('  ✅ Test 5 Passed: Full orchestrator generated valid closed-loop route with savings.\n');
}

console.log('============================================================');
console.log(`🎉 ALL ${testsPassed} TESTS PASSED SUCCESSFULLY!`);
console.log('============================================================');
```

---

# Frontend Code

### `frontend/vite.config.js`
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
```

---

### `frontend/src/App.jsx`
```jsx
/**
 * ============================================================================
 * GramChakra Frontend - Master Application Root Component
 * ============================================================================
 * File: frontend/src/App.jsx
 * Context: SBM-G Rural Solid Waste & MLP Management System
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import DashboardView from './components/views/DashboardView';
import WasteLoggerView from './components/views/WasteLoggerView';
import ClusterMap from './components/ClusterMap';
import PWMUProcessingView from './components/views/PWMUProcessingView';
import MarketplaceView from './components/views/MarketplaceView';

import { getPendingCount, flushQueue } from './utils/offlineQueue';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [isPhysicallyOnline, setIsPhysicallyOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [flushing, setFlushing] = useState(false);

  const [villages, setVillages] = useState([]);
  const [depot, setDepot] = useState(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsPhysicallyOnline(true);
      triggerAutoFlush();
    };

    const handleOffline = () => {
      setIsPhysicallyOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    updatePendingBadge();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchClusterMetadata = async () => {
    try {
      const [vRes, dRes] = await Promise.all([
        fetch('/api/villages'),
        fetch('/api/villages/depot')
      ]);

      const vData = await vRes.json();
      const dData = await dRes.json();

      if (vData.success) setVillages(vData.data);
      if (dData.success) setDepot(dData.data);
    } catch (err) {
      console.warn('Could not fetch village metadata:', err);
    }
  };

  useEffect(() => {
    fetchClusterMetadata();
  }, []);

  const updatePendingBadge = async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch (e) {
      console.warn('Error reading pending queue count:', e);
    }
  };

  const triggerAutoFlush = async () => {
    const isOffline = isSimulatedOffline || !navigator.onLine;
    if (isOffline) return;

    const count = await getPendingCount();
    if (count > 0) {
      setFlushing(true);
      const res = await flushQueue();
      setFlushing(false);
      updatePendingBadge();
      fetchClusterMetadata();
    }
  };

  const handleToggleSimulatedOffline = () => {
    const nextState = !isSimulatedOffline;
    setIsSimulatedOffline(nextState);

    if (!nextState && isPhysicallyOnline) {
      setTimeout(() => triggerAutoFlush(), 300);
    }
  };

  const handleManualFlush = async () => {
    setFlushing(true);
    await flushQueue();
    setFlushing(false);
    updatePendingBadge();
    fetchClusterMetadata();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isSimulatedOffline={isSimulatedOffline}
        onToggleSimulatedOffline={handleToggleSimulatedOffline}
        isPhysicallyOnline={isPhysicallyOnline}
        pendingCount={pendingCount}
        onFlushQueue={handleManualFlush}
        flushing={flushing}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && <DashboardView />}

        {activeTab === 'logger' && (
          <WasteLoggerView
            villages={villages}
            isSimulatedOffline={isSimulatedOffline}
            isPhysicallyOnline={isPhysicallyOnline}
            onLogSaved={() => {
              fetchClusterMetadata();
              updatePendingBadge();
            }}
            onQueueUpdated={updatePendingBadge}
          />
        )}

        {activeTab === 'routes' && (
          <ClusterMap
            villages={villages}
            depot={depot}
            onRouteGenerated={() => fetchClusterMetadata()}
          />
        )}

        {activeTab === 'processing' && (
          <PWMUProcessingView onBatchCreated={() => fetchClusterMetadata()} />
        )}

        {activeTab === 'marketplace' && (
          <MarketplaceView onOrderPlaced={() => fetchClusterMetadata()} />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800">GramChakra</span>
            <span>•</span>
            <span>Swachh Bharat Mission (Gramin) Phase II - Solid Waste Management</span>
          </div>
          <div className="text-slate-400">
            Plastic Waste Management Unit (PWMU) / Material Recovery Facility (MRF) Operations
          </div>
        </div>
      </footer>
    </div>
  );
}
```

---

### `frontend/src/utils/offlineQueue.js`
```javascript
/**
 * ============================================================================
 * GramChakra Frontend - Offline Queue & Synchronization Manager
 * ============================================================================
 * Module: frontend/src/utils/offlineQueue.js
 * Description:
 *   Provides low-bandwidth, offline-first data persistence for rural Swachhata
 *   Doots. Utilizes browser IndexedDB to buffer 4-stream waste logs during edge
 *   network blackouts and flushes queued records atomically when online.
 * ============================================================================
 */

const DB_NAME = 'gramchakra_offline_db';
const STORE_NAME = 'waste_logs_queue';
const DB_VERSION = 1;

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported in this browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'client_sync_id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function generateSyncId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'SYNC_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

export async function enqueueWasteLog(logData) {
  const db = await openOfflineDB();
  const client_sync_id = logData.client_sync_id || generateSyncId();
  const record = {
    ...logData,
    client_sync_id,
    recorded_at: logData.recorded_at || new Date().toISOString(),
    sync_status: 'PENDING'
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(record);

    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingQueue() {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingCount() {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.count();

    request.onsuccess = () => resolve(request.result || 0);
    request.onerror = () => reject(request.error);
  });
}

export async function flushQueue() {
  try {
    const pendingItems = await getPendingQueue();
    if (pendingItems.length === 0) {
      return { syncedCount: 0, error: null };
    }

    const response = await fetch('/api/waste-logs/batch-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: pendingItems })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Sync failed with HTTP ${response.status}`);
    }

    const db = await openOfflineDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    return { syncedCount: pendingItems.length, error: null };
  } catch (err) {
    console.warn('[GramChakra Sync] Flush failed, will retry later:', err);
    return { syncedCount: 0, error: err.message };
  }
}
```

---

### `frontend/src/components/Header.jsx`
```jsx
/**
 * ============================================================================
 * GramChakra Frontend - Header & 1-Click Offline Demo Controls
 * ============================================================================
 * Component: frontend/src/components/Header.jsx
 * ============================================================================
 */

import React from 'react';
import {
  Recycle,
  LayoutDashboard,
  Scale,
  MapPin,
  Factory,
  ShoppingBag,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  RotateCw
} from 'lucide-react';

export default function Header({
  activeTab = 'dashboard',
  onTabChange,
  isSimulatedOffline,
  onToggleSimulatedOffline,
  isPhysicallyOnline,
  pendingCount = 0,
  onFlushQueue,
  flushing = false
}) {
  const isEffectivelyOffline = isSimulatedOffline || !isPhysicallyOnline;

  const tabs = [
    { id: 'dashboard', label: 'Analytics & KPIs', icon: LayoutDashboard },
    { id: 'logger', label: '4-Stream Logger', icon: Scale },
    { id: 'routes', label: 'Route Optimizer', icon: MapPin },
    { id: 'processing', label: 'PWMU Upcycling', icon: Factory },
    { id: 'marketplace', label: 'Buyer Portal', icon: ShoppingBag }
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-blue-600 flex items-center justify-center text-white shadow-md">
            <Recycle className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900">GramChakra</h1>
              <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                SBM-G Phase II
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Multi-Layer Plastic (MLP) Management & Dynamic Rural Route Optimization
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="text-xs font-bold text-slate-700">Simulate Offline:</span>
            <button
              onClick={onToggleSimulatedOffline}
              type="button"
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isSimulatedOffline ? 'bg-amber-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isSimulatedOffline ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
              isSimulatedOffline
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : !isPhysicallyOnline
                ? 'bg-red-50 text-red-800 border-red-300'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
            }`}
          >
            {isSimulatedOffline ? (
              <>
                <CloudOff className="h-4 w-4 text-amber-600 animate-pulse" />
                <span>Simulated Offline</span>
              </>
            ) : !isPhysicallyOnline ? (
              <>
                <WifiOff className="h-4 w-4 text-red-600" />
                <span>No Connection</span>
              </>
            )}
          </div>

          {pendingCount > 0 && (
            <button
              onClick={onFlushQueue}
              disabled={flushing || isEffectivelyOffline}
              title={isEffectivelyOffline ? 'Switch to Online to flush queue' : 'Click to flush queued logs now'}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50"
            >
              <RotateCw className={`h-3.5 w-3.5 ${flushing ? 'animate-spin' : ''}`} />
              <span>
                {flushing ? 'Flushing...' : `${pendingCount} Pending Sync`}
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-1 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-2 py-2.5 px-3.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
```

---

### `frontend/src/components/ClusterMap.jsx`
```jsx
/**
 * ============================================================================
 * GramChakra Frontend - Interactive Cluster & Dynamic Route Leaflet Map
 * ============================================================================
 * Component: frontend/src/components/ClusterMap.jsx
 * ============================================================================
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Fuel, Leaf, Milestone, Navigation, Play, RefreshCw, AlertTriangle } from 'lucide-react';

export default function ClusterMap({ villages = [], depot = null, onRouteGenerated = null }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayerRef = useRef(null);
  const markersLayerRef = useRef(null);

  const [threshold, setThreshold] = useState(75);
  const [optimizing, setOptimizing] = useState(false);
  const [activeRoute, setActiveRoute] = useState(null);
  const [routeMessage, setRouteMessage] = useState('');

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter = depot ? [depot.latitude, depot.longitude] : [23.2599, 77.4126];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 11,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | SBM-G GramChakra'
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const createCustomIcon = (type, fillPercent = 0) => {
    if (type === 'DEPOT') {
      return L.divIcon({
        className: 'custom-depot-pin',
        html: `
          <div style="background-color: #1D4ED8; color: white; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(29, 78, 216, 0.5); border: 2px solid #ffffff;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });
    }

    const isCritical = fillPercent >= threshold;
    const isMedium = fillPercent >= 50 && fillPercent < threshold;
    const bgColor = isCritical ? '#DC2626' : isMedium ? '#F59E0B' : '#10B981';
    const animationClass = isCritical ? 'pulsing-alert-pin' : '';

    return L.divIcon({
      className: 'custom-village-pin',
      html: `
        <div class="${animationClass}" style="background-color: ${bgColor}; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; box-shadow: 0 4px 8px rgba(0,0,0,0.25); border: 2px solid #ffffff;">
          <span>${Math.round(fillPercent)}%</span>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
  };

  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    if (depot) {
      const depotMarker = L.marker([depot.latitude, depot.longitude], {
        icon: createCustomIcon('DEPOT')
      });
      depotMarker.bindPopup(`
        <div style="font-family: inherit; padding: 4px;">
          <strong style="color: #1D4ED8; font-size: 13px;">${depot.name}</strong>
          <div style="font-size: 11px; color: #64748B; margin-top: 2px;">Central Plastic Waste Processing Unit</div>
          <div style="margin-top: 6px; font-size: 11px; font-weight: 600; color: #0F172A;">Operational Hub: Collection Vehicle Depot & Agglomerator</div>
        </div>
      `);
      markersLayerRef.current.addLayer(depotMarker);
    }

    villages.forEach((village) => {
      const isCritical = village.current_fill_percent >= threshold;
      const marker = L.marker([village.latitude, village.longitude], {
        icon: createCustomIcon('VILLAGE', village.current_fill_percent)
      });

      marker.bindPopup(`
        <div style="font-family: inherit; padding: 4px; min-width: 170px;">
          <strong style="font-size: 13px; color: #0F172A;">${village.name}</strong>
          <div style="font-size: 11px; color: #64748B;">${village.panchayat_name} (${village.block_name})</div>
          <hr style="margin: 6px 0; border: none; border-top: 1px solid #E2E8F0;" />
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span>Current Shed Fill:</span>
            <strong style="color: ${isCritical ? '#DC2626' : '#10B981'};">${village.current_fill_percent}%</strong>
          </div>
          <div style="margin-top: 4px; font-size: 11px; font-weight: 600; color: ${isCritical ? '#DC2626' : '#64748B'};">
            ${isCritical ? '🚨 Pickup Threshold Breached' : '⏳ Capacity Adequate - No Action'}
          </div>
        </div>
      `);

      markersLayerRef.current.addLayer(marker);
    });
  }, [villages, depot, threshold]);

  const handleOptimizeRoute = async () => {
    try {
      setOptimizing(true);
      setRouteMessage('');

      const res = await fetch('/api/routes/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threshold: Number(threshold),
          vehicle_no: 'MP-04-GA-4501 (Tata Ace SBM-G Tipper)'
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Route optimization failed');
      }

      if (!data.action_required) {
        setRouteMessage(data.message);
        setActiveRoute(null);
        if (routeLayerRef.current) routeLayerRef.current.clearLayers();
        return;
      }

      setActiveRoute(data.data);
      if (onRouteGenerated) onRouteGenerated(data.data);

      if (routeLayerRef.current && data.data && data.data.tour) {
        routeLayerRef.current.clearLayers();
        const latLngs = data.data.tour.map((p) => [p.latitude, p.longitude]);

        const polyline = L.polyline(latLngs, {
          color: '#2563EB',
          weight: 4,
          opacity: 0.85,
          dashArray: '8, 8',
          lineCap: 'round'
        }).addTo(routeLayerRef.current);

        mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [40, 40] });
      }
    } catch (err) {
      console.error('Route optimization error:', err);
      setRouteMessage(err.message || 'Failed to compute dynamic route');
    } finally {
      setOptimizing(false);
    }
  };

  const criticalCount = villages.filter((v) => v.current_fill_percent >= threshold).length;

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[750px]">
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative">
        <div className="absolute top-4 left-14 z-[1000] bg-white/95 backdrop-blur-md rounded-lg shadow-md border border-slate-200 p-3 max-w-sm">
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Live Village Cluster GIS</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {villages.length} rural aggregation sheds monitored around Central PWMU.
          </div>
          <div className="mt-2 flex items-center space-x-3 text-[11px]">
            <span className="flex items-center text-slate-700 font-medium">
              <span className="h-3 w-3 rounded-full bg-blue-600 mr-1 inline-block"></span> PWMU Depot
            </span>
            <span className="flex items-center text-red-600 font-bold">
              <span className="h-3 w-3 rounded-full bg-red-600 mr-1 inline-block"></span> ≥{threshold}% Critical ({criticalCount})
            </span>
            <span className="flex items-center text-emerald-600 font-medium">
              <span className="h-3 w-3 rounded-full bg-emerald-500 mr-1 inline-block"></span> &lt;{threshold}% Normal
            </span>
          </div>
        </div>

        <div ref={mapContainerRef} className="flex-1 w-full h-full" />
      </div>

      <div className="w-full lg:w-96 flex flex-col space-y-4 overflow-y-auto">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Navigation className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Dynamic TSP Dispatch</h3>
                <p className="text-[11px] text-slate-500">Demand-Gated Pickup Optimizer</p>
              </div>
            </div>
            <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              SBM-G O&M
            </span>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Dynamic Fill Threshold</span>
                <span className="text-red-600 font-bold">{threshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="90"
                step="5"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>50% (High Frequency)</span>
                <span>75% (Recommended)</span>
                <span>90% (Strict Max)</span>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Total Cluster Sheds:</span>
                <strong className="text-slate-800">{villages.length}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Actionable Sheds (≥{threshold}%):</span>
                <strong className={criticalCount > 0 ? 'text-red-600' : 'text-slate-800'}>
                  {criticalCount} sheds
                </strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Vehicles Available:</span>
                <strong className="text-emerald-700">1 (3.5T Rural LCV)</strong>
              </div>
            </div>

            <button
              onClick={handleOptimizeRoute}
              disabled={optimizing}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center justify-center space-x-2 transition shadow-sm disabled:opacity-50"
            >
              {optimizing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Computing Nearest-Neighbor + 2-Opt...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-white" />
                  <span>Compute Dynamic Optimal Route</span>
                </>
              )}
            </button>

            {routeMessage && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{routeMessage}</span>
              </div>
            )}
          </div>
        </div>

        {activeRoute && activeRoute.metrics && (
          <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-xl p-5 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <Leaf className="h-5 w-5 text-emerald-400" />
                <h4 className="font-bold text-sm">O&M Resource Savings</h4>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-400/30">
                Verified
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="text-[10px] text-slate-300 uppercase tracking-wider flex items-center">
                  <Milestone className="h-3.5 w-3.5 mr-1 text-blue-400" /> Dist Saved
                </div>
                <div className="text-lg font-extrabold text-white mt-1">
                  {activeRoute.metrics.distance_saved_km} <span className="text-xs font-normal text-slate-300">km</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  vs {activeRoute.metrics.baseline_static_distance_km} km static
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="text-[10px] text-slate-300 uppercase tracking-wider flex items-center">
                  <Fuel className="h-3.5 w-3.5 mr-1 text-amber-400" /> Fuel Saved
                </div>
                <div className="text-lg font-extrabold text-white mt-1">
                  {activeRoute.metrics.fuel_savings_liters} <span className="text-xs font-normal text-slate-300">Liters</span>
                </div>
                <div className="text-[10px] text-emerald-300 font-bold mt-0.5">
                  ₹{activeRoute.metrics.fuel_savings_inr} Saved
                </div>
              </div>
            </div>

            <div className="mt-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5 flex items-center justify-between text-xs">
              <span className="text-emerald-200">Carbon Footprint Avoided:</span>
              <strong className="text-emerald-300 text-sm font-extrabold">
                {activeRoute.metrics.co2_savings_kg} kg CO₂
              </strong>
            </div>
          </div>
        )}

        {activeRoute && activeRoute.stops && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex-1">
            <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center justify-between">
              <span>Driver Itinerary ({activeRoute.stops.length} Stops)</span>
              <span className="text-[11px] font-semibold text-slate-500">Route: {activeRoute.id}</span>
            </h4>

            <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200">
              <div className="relative flex items-start space-x-3 text-xs pl-1">
                <span className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] z-10 shrink-0">D</span>
                <div>
                  <strong className="text-slate-900">{depot ? depot.name : 'Central PWMU Depot'}</strong>
                  <div className="text-[10px] text-slate-500">Origin Departure & Vehicle Weighment</div>
                </div>
              </div>

              {activeRoute.stops.map((stop) => (
                <div key={stop.stop_sequence} className="relative flex items-start space-x-3 text-xs pl-1">
                  <span className="h-5 w-5 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-[10px] z-10 shrink-0">
                    {stop.stop_sequence}
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <strong className="text-slate-900">{stop.village_name}</strong>
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                        {stop.village_fill_at_dispatch}% Fill
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">{stop.panchayat_name}</div>
                  </div>
                </div>
              ))}

              <div className="relative flex items-start space-x-3 text-xs pl-1">
                <span className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] z-10 shrink-0">D</span>
                <div>
                  <strong className="text-slate-900">{depot ? depot.name : 'Central PWMU Depot'}</strong>
                  <div className="text-[10px] text-slate-500">Return & Unload Segregated Waste at MRF</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### `frontend/src/components/charts/StreamBreakdownChart.jsx`
```jsx
import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

export default function StreamBreakdownChart({ data = [], totalKg = 0, loading = false }) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
        <span className="ml-2 text-sm">Loading 4-stream breakdown...</span>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const percentage = totalKg > 0 ? ((item.value / totalKg) * 100).toFixed(1) : 0;
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <div className="flex items-center space-x-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.payload.fill }}></span>
            <span className="font-semibold text-slate-800 text-xs">{item.name}</span>
          </div>
          <div className="mt-1 text-sm font-bold text-slate-900">
            {item.value.toLocaleString('en-IN')} kg
            <span className="ml-1 text-xs font-normal text-slate-500">({percentage}%)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-base">4-Stream Waste Segregation</h3>
          <p className="text-xs text-slate-500">Total Segregated: <strong className="text-slate-800">{totalKg.toLocaleString('en-IN')} kg</strong></p>
        </div>
        <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
          SBM-G Streams
        </span>
      </div>

      <div className="relative flex-1 min-h-[260px] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill || '#10B981'} stroke="#ffffff" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={(value) => <span className="text-xs font-medium text-slate-700">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

---

### `frontend/src/components/charts/VillageFillChart.jsx`
```jsx
import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell
} from 'recharts';

export default function VillageFillChart({ data = [], threshold = 75.0, loading = false }) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-500 border-t-transparent"></div>
        <span className="ml-2 text-sm">Loading village shed capacities...</span>
      </div>
    );
  }

  const criticalCount = data.filter((v) => v.fill_percent >= threshold).length;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const isUrgent = item.fill_percent >= threshold;
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <div className="font-bold text-slate-900 text-sm">{item.name}</div>
          <div className="text-xs text-slate-500">{item.panchayat}</div>
          <div className="mt-2 flex items-center justify-between space-x-3">
            <span className="text-xs font-medium text-slate-600">Shed Fill Level:</span>
            <span className={`text-sm font-extrabold ${isUrgent ? 'text-red-600' : 'text-slate-800'}`}>
              {item.fill_percent}%
            </span>
          </div>
          {isUrgent && (
            <div className="mt-1 text-[11px] font-semibold text-red-600 flex items-center">
              🚨 Exceeds {threshold}% Threshold - Route Pickup Active
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-base">Village Collection Shed Capacity</h3>
          <p className="text-xs text-slate-500">
            Actionable Threshold: <strong className="text-red-600">≥ {threshold}%</strong> ({criticalCount} sheds critical)
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span className="flex items-center text-slate-600"><span className="h-2.5 w-2.5 rounded-sm bg-red-600 mr-1"></span> ≥75%</span>
          <span className="flex items-center text-slate-600"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500 mr-1"></span> 50-74%</span>
          <span className="flex items-center text-slate-600"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 mr-1"></span> &lt;50%</span>
        </div>
      </div>

      <div className="relative flex-1 min-h-[260px] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 40 }}>
            <XAxis
              dataKey="name"
              angle={-35}
              textAnchor="end"
              interval={0}
              height={50}
              tick={{ fontSize: 10, fill: '#64748B' }}
            />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} unit="%" />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={threshold}
              stroke="#DC2626"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: `Pickup Trigger (${threshold}%)`,
                position: 'top',
                fill: '#DC2626',
                fontSize: 10,
                fontWeight: 700
              }}
            />
            <Bar dataKey="fill_percent" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`bar-${index}`} fill={entry.bar_color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

---

### `frontend/src/components/charts/FinancialLedgerChart.jsx`
```jsx
import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

export default function FinancialLedgerChart({ data = [], loading = false }) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
        <span className="ml-2 text-sm">Loading financial sustainability ledger...</span>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const monthData = payload[0].payload;
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg min-w-[190px]">
          <div className="font-bold text-slate-900 text-sm border-b pb-1 mb-2">Month: {label}</div>
          <div className="flex justify-between text-xs py-0.5">
            <span className="text-emerald-700 font-medium">Product Sales & Scrap:</span>
            <span className="font-bold text-slate-800">₹{monthData.revenue_inr.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-xs py-0.5">
            <span className="text-slate-600 font-medium">O&M Expenses (Fuel/Wages):</span>
            <span className="font-bold text-slate-800">₹{monthData.expenses_inr.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-xs py-1 border-t mt-1 font-extrabold">
            <span className={monthData.net_margin_inr >= 0 ? 'text-emerald-600' : 'text-red-600'}>Net Margin:</span>
            <span className={monthData.net_margin_inr >= 0 ? 'text-emerald-600' : 'text-red-600'}>
              {monthData.net_margin_inr >= 0 ? '+' : ''}₹{monthData.net_margin_inr.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-medium">
            Cost Recovery: <strong className="text-slate-800">{monthData.cost_recovery_percent}%</strong>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-base">O&M Cost Recovery & Financial Self-Sustainability</h3>
          <p className="text-xs text-slate-500">6-Month Cash Flow (Product Revenue vs Vehicle Fuel & Operator Wages)</p>
        </div>
        <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
          GP O&M Ledger
        </span>
      </div>

      <div className="relative flex-1 min-h-[260px] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
            <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={30} iconType="circle" />
            <Bar dataKey="revenue_inr" name="Revenue (Credits)" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses_inr" name="O&M Costs (Debits)" fill="#94A3B8" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="net_margin_inr" name="Net Margin" stroke="#2563EB" strokeWidth={3} dot={{ r: 4, fill: '#2563EB' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

---

### `frontend/src/components/charts/ProductInventoryChart.jsx`
```jsx
import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';

export default function ProductInventoryChart({ data = [], loading = false }) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
        <span className="ml-2 text-sm">Loading upcycled inventory stock...</span>
      </div>
    );
  }

  const totalValuation = data.reduce((acc, curr) => acc + (curr.inventory_value_inr || 0), 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg min-w-[180px]">
          <div className="font-bold text-slate-900 text-sm">{item.displayName}</div>
          <div className="mt-2 text-xs text-slate-600">
            Available Warehouse Stock: <strong className="text-slate-900 text-sm">{item.stock_units.toLocaleString('en-IN')} units</strong>
          </div>
          <div className="text-xs text-slate-600">
            Govt / Contractor Unit Price: <strong className="text-emerald-700">₹{item.unit_price_inr}</strong>
          </div>
          <div className="mt-1 pt-1 border-t text-xs font-semibold text-indigo-700">
            Stock Valuation: ₹{item.inventory_value_inr.toLocaleString('en-IN')}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-base">Upcycled MLP Product Stock</h3>
          <p className="text-xs text-slate-500">
            Warehouse Valuation: <strong className="text-indigo-700">₹{totalValuation.toLocaleString('en-IN')}</strong>
          </p>
        </div>
        <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
          PWMU Finished Goods
        </span>
      </div>

      <div className="relative flex-1 min-h-[260px] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 15, right: 25, left: 20, bottom: 15 }}>
            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
            <YAxis type="category" dataKey="displayName" width={130} tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="stock_units" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill || '#6366F1'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

---

### `frontend/src/components/views/DashboardView.jsx`
```jsx
import React, { useState, useEffect } from 'react';
import {
  Recycle,
  Fuel,
  TrendingUp,
  AlertOctagon,
  RefreshCw,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

import StreamBreakdownChart from '../charts/StreamBreakdownChart';
import VillageFillChart from '../charts/VillageFillChart';
import FinancialLedgerChart from '../charts/FinancialLedgerChart';
import ProductInventoryChart from '../charts/ProductInventoryChart';

export default function DashboardView() {
  const [kpis, setKpis] = useState(null);
  const [streamData, setStreamData] = useState([]);
  const [totalStreamKg, setTotalStreamKg] = useState(0);
  const [villageData, setVillageData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true);
      const [kpiRes, streamRes, villageRes, monthlyRes, inventoryRes] = await Promise.all([
        fetch('/api/analytics/kpis'),
        fetch('/api/analytics/stream-breakdown'),
        fetch('/api/analytics/village-fills'),
        fetch('/api/analytics/monthly-financials'),
        fetch('/api/analytics/product-inventory')
      ]);

      const kpiJson = await kpiRes.json();
      const streamJson = await streamRes.json();
      const villageJson = await villageRes.json();
      const monthlyJson = await monthlyRes.json();
      const inventoryJson = await inventoryRes.json();

      if (kpiJson.success) setKpis(kpiJson.data);
      if (streamJson.success) {
        setStreamData(streamJson.data);
        setTotalStreamKg(streamJson.total_kg);
      }
      if (villageJson.success) setVillageData(villageJson.data);
      if (monthlyJson.success) setMonthlyData(monthlyJson.data);
      if (inventoryJson.success) setInventoryData(inventoryJson.data);
    } catch (err) {
      console.error('Failed to load analytics dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAnalytics();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            SBM-G PWMU Command Center & Analytics
          </h2>
          <p className="text-xs text-slate-500">
            Real-time multi-village tracking, dynamic route savings, and O&M financial self-sustainability
          </p>
        </div>

        <button
          onClick={fetchAllAnalytics}
          disabled={loading}
          className="self-start sm:self-auto px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">MLP Diverted from Dumps</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Recycle className="h-5 w-5" /></div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-slate-900">
              {kpis ? kpis.total_mlp_diverted_kg.toLocaleString('en-IN') : '...'} <span className="text-sm font-normal text-slate-500">kg</span>
            </div>
            <div className="text-xs text-emerald-600 font-semibold mt-1 flex items-center">
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Upcycled into Pavers & Posts
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Route Fuel Cost Savings</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Fuel className="h-5 w-5" /></div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-emerald-600">
              ₹{kpis ? kpis.total_fuel_savings_inr.toLocaleString('en-IN') : '0'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Avoided {kpis ? kpis.total_co2_saved_kg : '0'} kg CO₂ emissions
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">O&M Cost Recovery Ratio</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><TrendingUp className="h-5 w-5" /></div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-blue-700">{kpis ? kpis.cost_recovery_percent : '...'}%</div>
            <div className="text-xs text-emerald-600 font-semibold mt-1 flex items-center">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Self-Sustainable (Zero Grant Dependency)
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sheds Requiring Pickup</span>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertOctagon className="h-5 w-5" /></div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-red-600">
              {kpis ? kpis.critical_sheds_needing_pickup : '0'} <span className="text-sm font-normal text-slate-500">sheds</span>
            </div>
            <div className="text-xs text-red-600 font-semibold mt-1">Breached ≥ 75% Fill Threshold</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 min-h-[360px]">
          <StreamBreakdownChart data={streamData} totalKg={totalStreamKg} loading={loading} />
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 min-h-[360px]">
          <VillageFillChart data={villageData} threshold={75.0} loading={loading} />
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 min-h-[360px]">
          <FinancialLedgerChart data={monthlyData} loading={loading} />
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 min-h-[360px]">
          <ProductInventoryChart data={inventoryData} loading={loading} />
        </div>
      </div>
    </div>
  );
}
```

---

### `frontend/src/components/views/WasteLoggerView.jsx`
```jsx
import React, { useState } from 'react';
import { Scale, CloudOff, Cloud, CheckCircle, AlertCircle, MapPin, Send, User, Clock } from 'lucide-react';
import { enqueueWasteLog, generateSyncId } from '../../utils/offlineQueue';

export default function WasteLoggerView({
  villages = [],
  isSimulatedOffline = false,
  isPhysicallyOnline = true,
  onLogSaved = null,
  onQueueUpdated = null
}) {
  const isOffline = isSimulatedOffline || !isPhysicallyOnline;

  const [selectedVillageId, setSelectedVillageId] = useState(villages[0]?.id || 'VIL_01');
  const [fillPercent, setFillPercent] = useState(85);
  const [wetKg, setWetKg] = useState('');
  const [dryKg, setDryKg] = useState('');
  const [mlPkg, setMlPkg] = useState('');
  const [sanitaryKg, setSanitaryKg] = useState('');
  const [loggedBy, setLoggedBy] = useState('Ramesh Sharma (Swachhata Doot)');

  const [statusMessage, setStatusMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVillageId) {
      alert('Please select a village aggregation point');
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    const payload = {
      client_sync_id: generateSyncId(),
      village_id: selectedVillageId,
      wet_waste_kg: Number(wetKg) || 0,
      dry_recyclable_kg: Number(dryKg) || 0,
      mlp_waste_kg: Number(mlPkg) || 0,
      sanitary_hazardous_kg: Number(sanitaryKg) || 0,
      recorded_fill_percent: Number(fillPercent),
      logged_by: loggedBy,
      recorded_at: new Date().toISOString()
    };

    try {
      if (isOffline) {
        await enqueueWasteLog(payload);
        setStatusMessage({
          type: 'offline',
          text: `Log safely buffered in local IndexedDB offline queue (${payload.client_sync_id.substring(0, 8)}...). Will auto-flush upon reconnection.`
        });
        if (onQueueUpdated) onQueueUpdated();
      } else {
        const res = await fetch('/api/waste-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to submit log');

        setStatusMessage({
          type: 'online',
          text: `Waste log synced directly to SQLite database for ${villages.find((v) => v.id === selectedVillageId)?.name || 'Village'}.`
        });
        if (onLogSaved) onLogSaved();
      }

      setWetKg('');
      setDryKg('');
      setMlPkg('');
      setSanitaryKg('');
    } catch (err) {
      console.error('Submission error:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Error recording waste log.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Scale className="h-6 w-6" /></span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">4-Stream Source Waste Logger</h2>
              <p className="text-xs text-slate-500">Low-bandwidth field entry for Swachhata Doots & SHG Operators</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {isOffline ? (
            <div className="flex items-center space-x-2 bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
              <CloudOff className="h-4 w-4 text-amber-600 animate-pulse" />
              <span>Offline Mode Active (Local IndexedDB Storage)</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
              <Cloud className="h-4 w-4 text-emerald-600" />
              <span>Online (Direct Server Sync)</span>
            </div>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-xl text-xs flex items-start space-x-3 border ${
          statusMessage.type === 'offline' ? 'bg-amber-50 border-amber-200 text-amber-900' :
          statusMessage.type === 'online' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
          'bg-red-50 border-red-200 text-red-900'
        }`}>
          {statusMessage.type === 'offline' ? <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" /> :
           statusMessage.type === 'online' ? <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" /> :
           <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />}
          <span className="font-medium leading-relaxed">{statusMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center">
                <MapPin className="h-3.5 w-3.5 mr-1 text-slate-500" /> Village Aggregation Shed
              </label>
              <select
                value={selectedVillageId}
                onChange={(e) => setSelectedVillageId(e.target.value)}
                className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {villages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.panchayat_name}) — Current: {v.current_fill_percent}%
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center">
                <User className="h-3.5 w-3.5 mr-1 text-slate-500" /> Logging Field Officer
              </label>
              <input
                type="text"
                value={loggedBy}
                onChange={(e) => setLoggedBy(e.target.value)}
                className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Name of Swachhata Doot"
              />
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-800">Current Collection Shed Fill Level (%)</span>
              <span className={`text-sm font-extrabold px-2.5 py-0.5 rounded-full ${
                fillPercent >= 75 ? 'bg-red-100 text-red-700 border border-red-200' :
                fillPercent >= 50 ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                'bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}>
                {fillPercent}% {fillPercent >= 75 ? '(Actionable Threshold Breached)' : ''}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={fillPercent}
              onChange={(e) => setFillPercent(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 mt-1">
              <span>0% Empty</span>
              <span className="text-red-600 font-bold">75% Dynamic Route Trigger</span>
              <span>100% Overflowing</span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Daily Segregated Weights by Stream (Kilograms)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-800">1. Wet Organic</span>
                  <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={wetKg}
                  onChange={(e) => setWetKg(e.target.value)}
                  placeholder="0.0 kg"
                  className="w-full text-base font-bold bg-white border border-emerald-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <div className="text-[10px] text-emerald-700 mt-1">Compostable food & leaves</div>
              </div>

              <div className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-800">2. Dry Recyclable</span>
                  <span className="h-3 w-3 rounded-full bg-blue-500"></span>
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={dryKg}
                  onChange={(e) => setDryKg(e.target.value)}
                  placeholder="0.0 kg"
                  className="w-full text-base font-bold bg-white border border-blue-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <div className="text-[10px] text-blue-700 mt-1">PET, paper, glass, cans</div>
              </div>

              <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-900">3. MLP Laminates</span>
                  <span className="h-3 w-3 rounded-full bg-amber-500"></span>
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={mlPkg}
                  onChange={(e) => setMlPkg(e.target.value)}
                  placeholder="0.0 kg"
                  className="w-full text-base font-bold bg-white border border-amber-400 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <div className="text-[10px] text-amber-800 mt-1 font-medium">Chips, sachets, foils</div>
              </div>

              <div className="p-4 rounded-xl border-2 border-red-200 bg-red-50/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-red-800">4. Sanitary / Hazard</span>
                  <span className="h-3 w-3 rounded-full bg-red-500"></span>
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={sanitaryKg}
                  onChange={(e) => setSanitaryKg(e.target.value)}
                  placeholder="0.0 kg"
                  className="w-full text-base font-bold bg-white border border-red-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
                <div className="text-[10px] text-red-700 mt-1">Diapers, pesticide tins</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Total Input: <strong className="text-slate-800">{(Number(wetKg) || 0) + (Number(dryKg) || 0) + (Number(mlPkg) || 0) + (Number(sanitaryKg) || 0)} kg</strong>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center space-x-2 transition shadow-sm disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            <span>{isOffline ? 'Save to Offline Queue' : 'Submit & Sync to Cloud'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
```

---

### `frontend/src/components/views/PWMUProcessingView.jsx`
```jsx
import React, { useState, useEffect } from 'react';
import { Factory, Boxes, Zap, TrendingUp, Layers, RotateCw, Play, CheckCircle2, AlertTriangle } from 'lucide-react';

const RECIPES = {
  PAVER_BLOCK: {
    name: 'Heavy-Duty Paver Block',
    mlpRatio: 0.333,
    aggregateMultiplier: 3.0,
    aggregateName: 'River Sand & Stone Dust',
    unitName: 'Pieces',
    defaultUnitPrice: 45
  },
  FENCING_POST: {
    name: 'Reinforced 6ft Fencing Post',
    mlpRatio: 4.0,
    aggregateMultiplier: 2.0,
    aggregateName: 'Crushed Mineral Aggregate',
    unitName: 'Posts',
    defaultUnitPrice: 320
  },
  ROOF_TILE: {
    name: 'Interlocking Composite Roof Tile',
    mlpRatio: 1.5,
    aggregateMultiplier: 1.67,
    aggregateName: 'Class-F Fly Ash / Slag',
    unitName: 'Tiles',
    defaultUnitPrice: 180
  }
};

export default function PWMUProcessingView({ onBatchCreated = null }) {
  const [stockpile, setStockpile] = useState({ total_collected_mlp_kg: 0, total_consumed_mlp_kg: 0, available_stockpile_kg: 0 });
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [productType, setProductType] = useState('PAVER_BLOCK');
  const [mlpInput, setMlpInput] = useState('300');
  const [electricityKwh, setElectricityKwh] = useState('90');
  const [laborCost, setLaborCost] = useState('1800');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchProcessingData = async () => {
    try {
      setLoading(true);
      const [stockRes, batchRes] = await Promise.all([
        fetch('/api/processing/stockpile'),
        fetch('/api/processing/batches')
      ]);

      const stockData = await stockRes.json();
      const batchData = await batchRes.json();

      if (stockData.success) setStockpile(stockData.data);
      if (batchData.success) setBatches(batchData.data);
    } catch (err) {
      console.error('Error fetching processing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcessingData();
  }, []);

  const activeRecipe = RECIPES[productType];
  const mlpKg = Number(mlpInput) || 0;
  const estimatedAggregateKg = Math.round(mlpKg * activeRecipe.aggregateMultiplier);
  const expectedUnits = Math.floor(mlpKg / activeRecipe.mlpRatio);
  const estimatedSalesValuation = expectedUnits * activeRecipe.defaultUnitPrice;

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (mlpKg <= 0) {
      alert('Please enter a valid MLP input quantity');
      return;
    }
    if (mlpKg > stockpile.available_stockpile_kg) {
      alert(`MLP input (${mlpKg} kg) exceeds available warehouse stockpile (${stockpile.available_stockpile_kg} kg).`);
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      const res = await fetch('/api/processing/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_type: productType,
          mlp_input_kg: mlpKg,
          electricity_kwh: Number(electricityKwh) || 0,
          labor_cost_inr: Number(laborCost) || 0,
          batch_date: new Date().toISOString().split('T')[0]
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Batch creation failed');

      setFeedback({ type: 'success', text: data.message });
      fetchProcessingData();
      if (onBatchCreated) onBatchCreated();
    } catch (err) {
      console.error('Batch error:', err);
      setFeedback({ type: 'error', text: err.message || 'Failed to execute conversion batch.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center space-x-2 text-amber-600 text-xs font-bold uppercase tracking-wider">
            <Boxes className="h-4 w-4" />
            <span>Raw Shredded MLP Stockpile</span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {stockpile.available_stockpile_kg.toLocaleString('en-IN')} <span className="text-sm font-normal text-slate-500">kg available</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex justify-between">
            <span>Total Collected: {stockpile.total_collected_mlp_kg.toLocaleString('en-IN')} kg</span>
            <span>Processed: {stockpile.total_consumed_mlp_kg.toLocaleString('en-IN')} kg</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div
              className="bg-amber-500 h-1.5 rounded-full"
              style={{
                width: `${stockpile.total_collected_mlp_kg > 0 ? Math.min(100, (stockpile.available_stockpile_kg / stockpile.total_collected_mlp_kg) * 100) : 0}%`
              }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center space-x-2 text-emerald-600 text-xs font-bold uppercase tracking-wider">
            <Factory className="h-4 w-4" />
            <span>Completed Production Batches</span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {batches.length} <span className="text-sm font-normal text-slate-500">runs</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">Agglomeration & Hot Compression Hydraulic Pressing</div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center space-x-2 text-blue-600 text-xs font-bold uppercase tracking-wider">
            <TrendingUp className="h-4 w-4" />
            <span>Circularity Index</span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600">100% Zero-Landfill</div>
          <div className="mt-2 text-xs text-slate-500">Every kg of metallized MLP is upcycled into durable infrastructure</div>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-xs flex items-center space-x-2 border ${
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />}
          <span className="font-semibold">{feedback.text}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Layers className="h-5 w-5" /></div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">PWMU Upcycling Batch Conversion</h3>
              <p className="text-xs text-slate-500">Configure raw MLP input, aggregate matrix, and compute expected output units</p>
            </div>
          </div>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
            SBM-G Circular Economy
          </span>
        </div>

        <form onSubmit={handleCreateBatch} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Target Recycled Product</label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="PAVER_BLOCK">Heavy-Duty Paver Block (1:3 Sand Ratio)</option>
                <option value="FENCING_POST">Reinforced 6ft Fencing Post (1:2 Mineral)</option>
                <option value="ROOF_TILE">Interlocking Composite Roof Tile (Fly Ash)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Shredded MLP Input (kg)</label>
              <input
                type="number"
                min="10"
                step="5"
                value={mlpInput}
                onChange={(e) => setMlpInput(e.target.value)}
                className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="e.g. 300"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Max Available: {stockpile.available_stockpile_kg} kg</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center">
                <Zap className="h-3.5 w-3.5 mr-1 text-amber-500" /> Machine Power (kWh)
              </label>
              <input
                type="number"
                min="0"
                value={electricityKwh}
                onChange={(e) => setElectricityKwh(e.target.value)}
                className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-5 shadow-sm">
            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-3">Batch Conversion Yield & Economics (Real-time Model)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Required Additive:</span>
                <strong className="text-white text-sm block mt-0.5">{estimatedAggregateKg} kg</strong>
                <span className="text-[10px] text-slate-400">{activeRecipe.aggregateName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Expected Yield:</span>
                <strong className="text-emerald-400 text-sm block mt-0.5">{expectedUnits} {activeRecipe.unitName}</strong>
                <span className="text-[10px] text-slate-400">QA Pass Target: 98%</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Est. Sales Value:</span>
                <strong className="text-amber-300 text-sm block mt-0.5">₹{estimatedSalesValuation.toLocaleString('en-IN')}</strong>
                <span className="text-[10px] text-slate-400">@ ₹{activeRecipe.defaultUnitPrice}/unit</span>
              </div>
              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center space-x-2 transition shadow-sm disabled:opacity-50"
                >
                  {submitting ? <RotateCw className="h-4 w-4 animate-spin" /> : <><Play className="h-4 w-4 fill-white" /><span>Execute Batch</span></>}
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className="border-t border-slate-200">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Batch Conversion Audit Log ({batches.length} Records)</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-2.5 px-6">Batch Code</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Product</th>
                  <th className="py-2.5 px-4">MLP Input</th>
                  <th className="py-2.5 px-4">Aggregate Input</th>
                  <th className="py-2.5 px-4">Output Units</th>
                  <th className="py-2.5 px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-6 font-mono font-bold text-slate-800">{b.batch_code}</td>
                    <td className="py-3 px-4">{b.batch_date}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{RECIPES[b.product_type]?.name || b.product_type}</td>
                    <td className="py-3 px-4 text-amber-700 font-bold">{b.mlp_input_kg} kg</td>
                    <td className="py-3 px-4">{b.aggregate_input_kg} kg</td>
                    <td className="py-3 px-4 text-emerald-700 font-extrabold">{b.units_produced} units</td>
                    <td className="py-3 px-6 text-right">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[10px] border border-emerald-200">{b.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### `frontend/src/components/views/MarketplaceView.jsx`
```jsx
import React, { useState, useEffect } from 'react';
import { ShoppingBag, ShoppingCart, CheckCircle, AlertTriangle, FileText } from 'lucide-react';

export default function MarketplaceView({ onOrderPlaced = null }) {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [buyerName, setBuyerName] = useState('Barkheda Gram Panchayat (MGNREGA Cell)');
  const [buyerType, setBuyerType] = useState('GRAM_PANCHAYAT');
  const [contactPhone, setContactPhone] = useState('+91 98260 55432');
  const [deliveryAddress, setDeliveryAddress] = useState('Village Phanda Kalan CC Road Site');
  const [orderQuantity, setOrderQuantity] = useState(200);
  const [submitting, setSubmitting] = useState(false);
  const [orderAlert, setOrderAlert] = useState(null);

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      const [prodRes, orderRes] = await Promise.all([
        fetch('/api/marketplace/products'),
        fetch('/api/marketplace/orders')
      ]);

      const prodData = await prodRes.json();
      const orderData = await orderRes.json();

      if (prodData.success) setProducts(prodData.data);
      if (orderData.success) setOrders(orderData.data);
    } catch (err) {
      console.error('Marketplace fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
  }, []);

  const handleOpenOrderModal = (product) => {
    setSelectedProduct(product);
    setOrderQuantity(Math.max(product.min_order_units || 10, 50));
    setOrderAlert(null);
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const qty = Number(orderQuantity);
    if (qty <= 0 || qty > selectedProduct.stock_units) {
      alert(`Invalid quantity. Available stock is ${selectedProduct.stock_units}`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/marketplace/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_name: buyerName,
          buyer_type: buyerType,
          contact_phone: contactPhone,
          delivery_address: deliveryAddress,
          items: [{ product_id: selectedProduct.id, quantity: qty }]
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Order placement failed');

      setOrderAlert({ type: 'success', text: data.message });
      setSelectedProduct(null);
      fetchMarketData();
      if (onOrderPlaced) onOrderPlaced();
    } catch (err) {
      console.error('Order error:', err);
      setOrderAlert({ type: 'error', text: err.message || 'Failed to place procurement order.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg"><ShoppingBag className="h-6 w-6" /></span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">GramChakra Forward Linkages Marketplace</h2>
              <p className="text-xs text-slate-500">Panchayat & Contractor procurement portal for upcycled SBM-G MLP composite products</p>
            </div>
          </div>
        </div>
        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
          🌱 100% Sales Revenue Reinvested in Rural O&M
        </span>
      </div>

      {orderAlert && (
        <div className={`p-4 rounded-xl text-xs flex items-center space-x-2 border ${
          orderAlert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
        }`}>
          {orderAlert.type === 'success' ? <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />}
          <span className="font-semibold">{orderAlert.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.map((p) => {
          let title = p.product_type;
          let description = '';
          let badgeColor = 'bg-slate-100 text-slate-700';

          if (p.product_type === 'PAVER_BLOCK') {
            title = 'Heavy-Duty Paver Blocks';
            description = 'High compressive strength composite blocks for rural CC roads, pavements & drainage covers.';
            badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
          } else if (p.product_type === 'FENCING_POST') {
            title = '6ft Composite Fencing Posts';
            description = 'Termite-proof, weather-resistant structural posts for farm orchard fencing and boundary posts.';
            badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
          } else if (p.product_type === 'ROOF_TILE') {
            title = 'Interlocking Roof Tiles';
            description = 'Corrugated, high-tensile roof tiles engineered for community sheds, bus shelters and livestock sheds.';
            badgeColor = 'bg-indigo-100 text-indigo-800 border-indigo-200';
          }

          return (
            <div key={p.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col justify-between hover:shadow-md transition">
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${badgeColor}`}>{p.product_type}</span>
                  <span className="text-xs font-bold text-slate-500">Min Order: {p.min_order_units} {p.unit_name}s</span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-base mt-2">{title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{description}</p>
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Govt / PWD Rate</span>
                    <div className="text-xl font-extrabold text-slate-900">₹{p.unit_price_inr} <span className="text-xs font-normal text-slate-500">/ {p.unit_name}</span></div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Ready Stock</span>
                    <div className="text-sm font-extrabold text-emerald-700">{p.stock_units.toLocaleString('en-IN')} {p.unit_name}s</div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <button
                  onClick={() => handleOpenOrderModal(p)}
                  disabled={p.stock_units <= 0}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center justify-center space-x-2 transition shadow-sm disabled:opacity-40"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>{p.stock_units > 0 ? 'Procure for Panchayat' : 'Out of Stock'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Procurement Order Form</h3>
                <p className="text-xs text-slate-500">{selectedProduct.product_type} — Stock: {selectedProduct.stock_units} units</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handlePlaceOrder} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Procuring Entity / Buyer Name</label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Buyer Category</label>
                  <select
                    value={buyerType}
                    onChange={(e) => setBuyerType(e.target.value)}
                    className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="GRAM_PANCHAYAT">Gram Panchayat (MGNREGA)</option>
                    <option value="PWD_CONTRACTOR">PWD / PMGSY Contractor</option>
                    <option value="PRIVATE_FARMER">Private Farmer / Agritech</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Delivery Site / Panchayat Yard Location</label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Quantity ({selectedProduct.unit_name}s)</label>
                <input
                  type="number"
                  min="1"
                  max={selectedProduct.stock_units}
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">Total Purchase Invoice:</span>
                <span className="text-base font-extrabold text-blue-700">
                  ₹{(Number(orderQuantity) * selectedProduct.unit_price_inr).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex space-x-3 pt-2">
                <button type="button" onClick={() => setSelectedProduct(null)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center space-x-2 transition shadow-sm disabled:opacity-50">
                  <CheckCircle className="h-4 w-4" />
                  <span>Confirm Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center">
            <FileText className="h-4 w-4 mr-1 text-slate-500" /> Procurement Orders History ({orders.length})
          </h4>
          <span className="text-[11px] text-slate-500">Credited to GP O&M Sustainability Fund</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px]">
              <tr>
                <th className="py-2.5 px-6">Order No</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Buyer Entity</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Items Summary</th>
                <th className="py-2.5 px-4">Amount</th>
                <th className="py-2.5 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-6 font-mono font-bold text-slate-800">{o.order_number}</td>
                  <td className="py-3 px-4">{o.order_date}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{o.buyer_name}</td>
                  <td className="py-3 px-4"><span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{o.buyer_type}</span></td>
                  <td className="py-3 px-4 text-slate-500">{o.items?.map((it) => `${it.quantity}x ${it.product_type}`).join(', ') || 'Recycled Products'}</td>
                  <td className="py-3 px-4 font-bold text-emerald-700">₹{o.total_amount_inr?.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-6 text-right"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[10px] border border-emerald-200">{o.payment_status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```
