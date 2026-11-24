/**
 * ============================================================================
 * GramChakra Frontend - Forward Linkages & Contractor Marketplace View
 * ============================================================================
 * Component: frontend/src/components/views/MarketplaceView.jsx
 * Data Sources:
 *   - GET  /api/marketplace/products
 *   - GET  /api/marketplace/orders
 *   - POST /api/marketplace/orders
 * 
 * SBM-G Domain Context:
 *   Establishes self-sustaining forward linkages for circular MLP products.
 *   Enables local Gram Panchayats (MGNREGA/15th Finance Commission funds)
 *   and road contractors (PWD/PMGSY) to purchase recycled paver blocks and
 *   fencing posts directly, funding collection vehicle fuel and worker wages.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  ShoppingCart,
  Truck,
  IndianRupee,
  CheckCircle,
  AlertTriangle,
  FileText,
  Building,
  UserCheck
} from 'lucide-react';

export default function MarketplaceView({ onOrderPlaced = null }) {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Order Modal State
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
          items: [
            {
              product_id: selectedProduct.id,
              quantity: qty
            }
          ]
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Order placement failed');

      setOrderAlert({
        type: 'success',
        text: data.message
      });

      setSelectedProduct(null);
      fetchMarketData();
      if (onOrderPlaced) onOrderPlaced();
    } catch (err) {
      console.error('Order error:', err);
      setOrderAlert({
        type: 'error',
        text: err.message || 'Failed to place procurement order.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ShoppingBag className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">GramChakra Forward Linkages Marketplace</h2>
              <p className="text-xs text-slate-500">
                Panchayat & Contractor procurement portal for upcycled SBM-G MLP composite products
              </p>
            </div>
          </div>
        </div>

        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
          🌱 100% Sales Revenue Reinvested in Rural O&M
        </span>
      </div>

      {orderAlert && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center space-x-2 border ${
            orderAlert.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {orderAlert.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          )}
          <span className="font-semibold">{orderAlert.text}</span>
        </div>
      )}

      {/* Product Catalog Cards */}
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
            <div
              key={p.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col justify-between hover:shadow-md transition"
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${badgeColor}`}>
                    {p.product_type}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Min Order: {p.min_order_units} {p.unit_name}s
                  </span>
                </div>

                <h3 className="font-extrabold text-slate-900 text-base mt-2">{title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{description}</p>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Govt / PWD Rate</span>
                    <div className="text-xl font-extrabold text-slate-900">
                      ₹{p.unit_price_inr} <span className="text-xs font-normal text-slate-500">/ {p.unit_name}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Ready Stock</span>
                    <div className="text-sm font-extrabold text-emerald-700">
                      {p.stock_units.toLocaleString('en-IN')} {p.unit_name}s
                    </div>
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

      {/* Procurement Order Placement Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Procurement Order Form
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedProduct.product_type} — Stock: {selectedProduct.stock_units} units
                </p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePlaceOrder} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Procuring Entity / Buyer Name
                </label>
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
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Buyer Category
                  </label>
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
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Contact Phone
                  </label>
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
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Delivery Site / Panchayat Yard Location
                </label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Quantity ({selectedProduct.unit_name}s)
                </label>
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

              {/* Total Invoice Estimate */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">Total Purchase Invoice:</span>
                <span className="text-base font-extrabold text-blue-700">
                  ₹{(Number(orderQuantity) * selectedProduct.unit_price_inr).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center space-x-2 transition shadow-sm disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Confirm Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Orders History Ledger */}
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
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {o.buyer_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {o.items?.map((it) => `${it.quantity}x ${it.product_type}`).join(', ') || 'Recycled Products'}
                  </td>
                  <td className="py-3 px-4 font-bold text-emerald-700">
                    ₹{o.total_amount_inr?.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-6 text-right">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[10px] border border-emerald-200">
                      {o.payment_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
