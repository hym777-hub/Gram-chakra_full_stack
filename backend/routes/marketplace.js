/**
 * ============================================================================
 * GramChakra Backend - Forward Linkages & Buyer Marketplace API Router
 * ============================================================================
 * Module: backend/routes/marketplace.js
 * Endpoints:
 *   - GET  /api/marketplace/products : Product catalog with unit pricing and stock
 *   - GET  /api/marketplace/orders   : Procurement orders with nested line items
 *   - POST /api/marketplace/orders   : Places order, deducts stock, credits ledger
 * 
 * SBM-G Domain Context:
 *   Establishes forward market linkages for circular MLP products. Buyers include:
 *   1. Gram Panchayats: For internal village pavement, drains, community centers.
 *   2. PWD / PMGSY Contractors: For rural road shoulders and culverts.
 *   3. Private Farmers / Agritech: For durable termite-proof orchard fencing posts.
 *   Revenue directly credits the Gram Panchayat O&M sustainability ledger.
 * ============================================================================
 */

import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

/**
 * GET /api/marketplace/products
 * Returns product catalog with current warehouse stock levels.
 */
router.get('/products', (req, res) => {
  try {
    const products = db.prepare(`
      SELECT id, product_type, unit_name, stock_units, unit_price_inr, min_order_units, updated_at
      FROM finished_products
    `).all();

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('[API Error] Failed to fetch marketplace products:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /api/marketplace/orders
 * Returns all buyer procurement orders with their associated order line items.
 */
router.get('/orders', (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT * FROM buyer_orders
      ORDER BY order_date DESC
    `).all();

    // Attach line items to each order
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

    res.json({
      success: true,
      count: enrichedOrders.length,
      data: enrichedOrders
    });
  } catch (error) {
    console.error('[API Error] Failed to fetch orders:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /api/marketplace/orders
 * Places a new order, validates stock, decrements inventory, and credits the O&M ledger.
 */
router.post('/orders', (req, res) => {
  try {
    const {
      buyer_name,
      buyer_type = 'GRAM_PANCHAYAT',
      contact_phone,
      delivery_address,
      items
    } = req.body;

    if (!buyer_name || !contact_phone || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'buyer_name, contact_phone, and a non-empty items array are required.'
      });
    }

    const orderId = `ORD_${Date.now()}`;
    const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const today = new Date().toISOString().split('T')[0];

    const placeOrderTx = db.transaction(() => {
      let totalAmount = 0.0;
      const verifiedItems = [];

      // Validate stock and compute line totals
      for (const item of items) {
        const product = db.prepare('SELECT * FROM finished_products WHERE id = ?').get(item.product_id);
        if (!product) {
          throw new Error(`Product not found: ${item.product_id}`);
        }

        const qty = Number(item.quantity);
        if (!qty || qty <= 0) {
          throw new Error(`Invalid quantity for product ${product.product_type}`);
        }

        if (product.stock_units < qty) {
          throw new Error(
            `Insufficient stock for ${product.product_type}. Requested ${qty}, available ${product.stock_units}`
          );
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

      // Insert master order
      db.prepare(`
        INSERT INTO buyer_orders (
          id, order_number, buyer_name, buyer_type, contact_phone,
          delivery_address, total_amount_inr, payment_status, fulfillment_status, order_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderId,
        orderNumber,
        buyer_name,
        buyer_type,
        contact_phone,
        delivery_address || 'Panchayat Yard',
        totalAmount,
        'PAID',
        'ORDERED',
        today
      );

      // Insert items and decrement stock
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

      // Credit Gram Panchayat O&M Financial Ledger
      db.prepare(`
        INSERT INTO om_financial_ledger (id, entry_date, entry_type, category, amount_inr, reference_id, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        `LEDGER_SALE_${orderId}`,
        today,
        'REVENUE_CREDIT',
        'PRODUCT_SALES',
        totalAmount,
        orderNumber,
        `Recycled Product Sales to ${buyer_name} (${orderNumber})`
      );

      return { totalAmount, count: verifiedItems.length };
    });

    const result = placeOrderTx();

    res.status(201).json({
      success: true,
      message: `Order ${orderNumber} placed successfully! Total invoice: ₹${result.totalAmount.toLocaleString('en-IN')}`,
      data: {
        order_id: orderId,
        order_number: orderNumber,
        total_amount_inr: result.totalAmount
      }
    });
  } catch (error) {
    console.error('[API Error] Failed to place order:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
