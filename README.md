# 🌿 GramChakra

> **Technical Solutions for Multi-Layer Plastic (MLP) Management at PWMU/MRF Level**  
> *SBM-G Phase II Rural Solid Waste Management & Dynamic Vehicle Logistics*

---

## 📌 Project Overview
**GramChakra** is a full-stack, offline-first rural solid waste management platform engineered for the Swachh Bharat Mission - Gramin (SBM-G) Phase II. It solves key rural bottlenecks:
1. **4-Stream Source Segregation & Low-Bandwidth Logging:** Offline-first IndexedDB buffer with auto-sync and UUID idempotency for remote village collection sheds.
2. **Demand-Based Dynamic Route Optimization:** Eliminates wasteful fixed-route runs by dispatching collection vehicles only for sheds breaching the **75% fill threshold**, using a Haversine + Nearest-Neighbor + 2-Opt TSP engine.
3. **PWMU/MRF Batch Processing & Conversion:** Upcycling non-recyclable Multi-Layer Plastic (MLP) into durable composite products (Paver Blocks, Fencing Posts, Interlocking Roof Tiles).
4. **Forward Linkages & Financial Self-Sustainability:** Contractor & Gram Panchayat procurement portal with live O&M financial cost recovery tracking.

---

## 🚀 Quick Start (1-Click Run on Windows)
Simply double-click the included batch launcher:
```text
start_gramchakra.bat
```
This automatically verifies dependencies, launches the Express backend (Port 5000), starts the Vite frontend (Port 5173), and opens `http://localhost:5173` in your default browser.

---

## 🛠 Manual Execution

### 1. Backend API Server (Node.js + Express + SQLite)
```bash
cd backend
npm install
npm run seed      # Populates initial dataset (1 depot, 10 villages, 6mo ledger)
npm start         # Runs API on http://localhost:5000
```

### 2. Algorithmic Optimizer Test Suite
```bash
cd backend
npm run test:route # Verifies Haversine, 75% threshold, 2-Opt & diesel math
```

### 3. Frontend Client (React + Vite + Tailwind + Leaflet + Recharts)
```bash
cd frontend
npm install
npm run dev       # Runs UI on http://localhost:5173
```

---

## 📂 Project Structure
```text
gramchakra-mlp-swm/
├── backend/                   # Express.js REST API & SQLite DB
│   ├── data/pwmu.db           # SQLite database with seeded SBM-G dataset
│   ├── db/                    # Schema migrations & seed script
│   ├── routes/                # Modular REST routes (villages, routes, etc.)
│   ├── test/                  # Automated routing test suite
│   ├── utils/                 # Haversine + Nearest-Neighbor + 2-Opt engine
│   └── server.js              # Server entry point
├── frontend/                  # React + Vite + Tailwind Client
│   ├── src/components/charts/ # 4 Interactive Recharts graphs
│   ├── src/components/views/  # Dashboard, Logger, PWMU, Marketplace views
│   ├── src/components/        # Leaflet ClusterMap & Header controls
│   ├── src/utils/             # IndexedDB offline sync queue manager
│   └── src/App.jsx            # Main application coordinator
├── report_screenshots/        # High-resolution PNG captures for reports
├── REPORT_AND_PPT_GUIDE.md    # Technical report, API specs & 10-slide PPT outline
├── EXTRACTED_FULL_CODE.md     # Full source code compilation
└── start_gramchakra.bat       # 1-Click launcher
```
