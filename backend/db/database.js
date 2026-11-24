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
 * 
 * Schema Alignment:
 *   Enforces 1:1 parity with the SBM-G system architecture ER diagram:
 *   - VILLAGES: Rural cluster aggregation sheds and real-time fill rates.
 *   - WASTE_LOGS: 4-stream segregation weights with client-generated UUIDs.
 *   - COLLECTION_ROUTES: Dynamic TSP vehicle dispatch manifests and savings.
 *   - COLLECTION_ROUTE_STOPS: Sequential stops within a dispatch itinerary.
 *   - PROCESSING_BATCHES: Upcycling raw MLP into composite infrastructure items.
 *   - FINISHED_PRODUCTS: Warehouse stock and unit pricing for circular goods.
 *   - BUYER_ORDERS: Procurement orders from Gram Panchayats & PWD contractors.
 *   - ORDER_ITEMS: Line items attached to procurement orders.
 *   - OM_FINANCIAL_LEDGER: Credits and debits tracking GP O&M self-sustainability.
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
      entry_type TEXT NOT NULL, -- 'REVENUE_CREDIT' or 'EXPENSE_DEBIT'
      category TEXT NOT NULL,   -- 'PRODUCT_SALES', 'RECYCLABLES_SCRAP', 'FUEL_COST', 'OPERATOR_WAGES', 'ELECTRICITY'
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
