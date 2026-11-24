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
