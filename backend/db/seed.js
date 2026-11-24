/**
 * ============================================================================
 * GramChakra Backend - Realistic SBM-G Rural Cluster Data Seeder
 * ============================================================================
 * Module: backend/db/seed.js
 * Context: Swachhata Action Plan - Plastic Waste Management Unit (PWMU)
 * 
 * Seeding Scope:
 * 1. 1 Central PWMU Depot (Block Headquarters): Operational hub for collection
 *    vehicles, shredding units, and composite compression molding presses.
 * 2. 10 Surrounding Rural Villages:
 *    - 5 Critical High-Fill Sheds (76% - 92% fill): Trigger immediate dynamic pickup.
 *    - 5 Sub-Threshold Sheds (22% - 55% fill): Preserved to prevent wasteful trips.
 * 3. 30-Day Historical 4-Stream Waste Logs: Wet, Dry Recyclable, MLP, Sanitary.
 * 4. Production Batches: Tracking MLP conversion into Paver Blocks, Fencing Posts, Tiles.
 * 5. Finished Product Inventory: Pre-stocked goods available for Panchayat orders.
 * 6. Buyer Orders & Line Items: Verified purchase orders from rural road contractors.
 * 7. 6 Months of Financial Ledger Records: Proving operational break-even and
 *    long-term Gram Panchayat O&M self-sustainability.
 * ============================================================================
 */

import db from './database.js';

export function seedDatabase(force = false) {
  // Check if villages already seeded
  const existingVillages = db.prepare('SELECT COUNT(*) as count FROM villages').get();
  if (existingVillages && existingVillages.count > 0 && !force) {
    console.log('[GramChakra Seed] Database already contains records. Skipping auto-seed.');
    return;
  }

  console.log('[GramChakra Seed] Seeding realistic SBM-G rural cluster dataset...');

  // Wrap in transaction for atomic execution
  const runSeeder = db.transaction(() => {
    // 1. Clear existing rows if force is true
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

    // 2. Central Depot Reference (Stored for routing) & 10 Rural Villages
    // Cluster centered around Central MP Rural Block (Lat: 23.2599, Lng: 77.4126)
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

    // 3. Historical 4-Stream Waste Logs across last 30 days
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

    // 4. Finished Product Catalog
    const insertProduct = db.prepare(`
      INSERT INTO finished_products (id, product_type, unit_name, stock_units, unit_price_inr, min_order_units, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertProduct.run('PROD_PAVER', 'PAVER_BLOCK', 'Piece', 1850, 45.0, 50, new Date().toISOString());
    insertProduct.run('PROD_FENCE', 'FENCING_POST', '6ft Post', 420, 320.0, 10, new Date().toISOString());
    insertProduct.run('PROD_ROOF', 'ROOF_TILE', 'Interlocking Tile', 920, 180.0, 20, new Date().toISOString());

    // 5. Historical Processing Batches (Converting MLP into Products)
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

    // 6. Pre-seeded Buyer Orders & Items
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

    insertOrder.run(
      'ORD_001',
      'ORD-2026-001',
      'Rampur Gram Panchayat (MGNREGA Pavement Project)',
      'GRAM_PANCHAYAT',
      '+91 98261 44550',
      'Village Rampur Kalan Internal CC Road Site',
      36000.0,
      'PAID',
      'DELIVERED',
      '2026-10-20'
    );
    insertOrderItem.run('ITEM_001', 'ORD_001', 'PROD_PAVER', 800, 45.0, 36000.0);

    insertOrder.run(
      'ORD_002',
      'ORD-2026-002',
      'Om Prakash Yadav (Horticulture Farm)',
      'PRIVATE_FARMER',
      '+91 94250 88912',
      'Shivgarh Boundary Enclosure Site',
      25600.0,
      'PAID',
      'DELIVERED',
      '2026-11-02'
    );
    insertOrderItem.run('ITEM_002', 'ORD_002', 'PROD_FENCE', 80, 320.0, 25600.0);

    insertOrder.run(
      'ORD_003',
      'ORD-2026-003',
      'Shree Balaji PWD Road Contractor',
      'PWD_CONTRACTOR',
      '+91 97552 11043',
      'Devnagar Approach Road Drainage Pavement',
      54000.0,
      'PENDING',
      'ORDERED',
      '2026-11-20'
    );
    insertOrderItem.run('ITEM_003', 'ORD_003', 'PROD_PAVER', 1200, 45.0, 54000.0);

    // 7. 6 Months of Historical O&M Financial Ledger Records
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
      // Revenue credit from product sales
      insertLedger.run(
        `LEDGER_${ledgerIndex++}`,
        `${m.month}-25`,
        'REVENUE_CREDIT',
        'PRODUCT_SALES',
        m.revenue * 0.75,
        `ORD_BATCH_${m.month}`,
        `Monthly sales of recycled Paver Blocks & Fencing Posts for ${m.month}`
      );

      // Revenue credit from sorted recyclables scrap
      insertLedger.run(
        `LEDGER_${ledgerIndex++}`,
        `${m.month}-28`,
        'REVENUE_CREDIT',
        'RECYCLABLES_SCRAP',
        m.revenue * 0.25,
        `SCRAP_SALE_${m.month}`,
        `Sale of sorted PET bottles, cardboard, and metal scrap to registered recyclers`
      );

      // Expense debit: Vehicle fuel
      insertLedger.run(
        `LEDGER_${ledgerIndex++}`,
        `${m.month}-15`,
        'EXPENSE_DEBIT',
        'FUEL_COST',
        m.fuel,
        `FUEL_VOUCHER_${m.month}`,
        `Diesel expenditure for waste collection vehicle (Optimized Dynamic Routing)`
      );

      // Expense debit: Driver and operator wages
      insertLedger.run(
        `LEDGER_${ledgerIndex++}`,
        `${m.month}-05`,
        'EXPENSE_DEBIT',
        'OPERATOR_WAGES',
        m.wages,
        `PAYROLL_${m.month}`,
        `Monthly wages for vehicle driver and 2 PWMU shredder/molding operators`
      );

      // Expense debit: Electricity
      insertLedger.run(
        `LEDGER_${ledgerIndex++}`,
        `${m.month}-10`,
        'EXPENSE_DEBIT',
        'ELECTRICITY',
        m.elec,
        `ELEC_BILL_${m.month}`,
        `Industrial 3-phase electricity consumption for shredder, agglomerator & heat press`
      );
    }
  });

  runSeeder();
  console.log('[GramChakra Seed] Successfully seeded villages, waste logs, batches, orders, and 6-month financial ledger.');
}

// If invoked directly from CLI
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase(true);
}
