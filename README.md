# Shipment Delay Predictor - LogiDog

A comprehensive system for proactively identifying shipments at risk of delay, enabling operations teams to take corrective actions before problems become critical.

## 🎯 Project Overview

LogiDog is a leading global logistics company managing thousands of shipments daily. This system provides early alerts for shipments likely to be delayed, with a focus on:

- **Early Delay Identification**: Rule-based logic to detect at-risk shipments
- **Real-time Dashboard**: Visual interface for monitoring and managing alerts
- **Actionable Insights**: Clear indicators of delay causes and severity

## 📁 Project Structure

```
Shipment-Delay-Predictor/
├── frontend/          # Next.js 15 + TypeScript + Tailwind CSS
│   ├── app/          # Next.js App Router pages
│   ├── components/   # React components
│   ├── hooks/        # React Query hooks
│   ├── lib/          # Utilities and API client
│   └── types/        # TypeScript type definitions
├── backend/          # NestJS API (alerts + rule engine scaffold)
└── README.md         # This file
```

## 🚀 Getting Started

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`

**Environment Variables:**
Create a `.env.local` file in the `frontend` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Backend

```bash
cd backend
npm install
npm run start:dev
```

The API listens on `http://localhost:3001/api`. See [`backend/README.md`](backend/README.md) for the full endpoint catalog.

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI (Radix UI primitives)
- **Data Fetching**: React Query (TanStack Query)
- **Charts**: Recharts
- **Date Handling**: date-fns

### Backend
- **Framework**: NestJS 11
- **Language**: TypeScript
- **Validation**: class-validator / class-transformer
- **Data**: In-memory seed (ready to swap for PostgreSQL / Redis)
- **Real-time (Planned)**: Server-Sent Events (SSE)

## 📊 Features

### Current (Frontend)
- ✅ Alerts dashboard with real-time updates
- ✅ Advanced filtering (severity, mode, carrier, search)
- ✅ Visual analytics (severity distribution, risk causes)
- ✅ Responsive design
- ✅ Type-safe with TypeScript

### Planned
- [x] Backend API implementation
- [ ] Delay detection rule engine
- [ ] Real-time updates via SSE
- [ ] Alert detail pages
- [ ] User authentication
- [ ] Alert acknowledgment workflow
- [ ] Machine learning model integration

## 📝 API Design

The frontend expects the following API endpoints:

- `GET /api/alerts` - Fetch alerts with optional filters
- `GET /api/alerts/:shipmentId` - Get single alert details
- `POST /api/alerts/acknowledge` - Acknowledge an alert

See `frontend/lib/api-client.ts` for implementation details.

## 🔍 Delay Detection Logic

The system uses rule-based logic to identify at-risk shipments:

1. **Stale Status**: No milestone update for > 24 hours
2. **Late Final Mile**: ETA within 3 days but not in "Out for Delivery" stage
3. **Missed Departure**: Planned departure time passed but still in "Ready for Dispatch"
4. **Hub Congestion**: Dwell time exceeds average + 1σ
5. **Exception Codes**: Customs holds, missing documentation, etc.

## 📚 Documentation

### Assignment Documentation
- [Complete Assignment Documentation](docs/ASSIGNMENT_COMPLETE.md) - **Unified document covering all 4 parts** (Problem Analysis, UI Design, Sample Data & API, Delay Logic Implementation)
- [UI Design Reference](docs/UI_DESIGN_REFERENCE.md) - Visual design reference for Draw.io/Canva/Miro
- [Delay Logic Implementation](docs/delay-logic-implementation.ts) - Standalone TypeScript code for Part 4
- [Delay Risk Rules Engine](docs/DELAY_RISK_RULES_ENGINE.md) - **Comprehensive ML-style rules engine and scoring system** for delay prediction

### Technical Documentation
- [Frontend README](frontend/README.md) - Detailed frontend documentation
- [Backend README](backend/README.md) - API endpoints, sample payloads, run/test instructions

## 🤝 Contributing

This is a project for the LogiDog logistics company. For questions or contributions, please contact the project maintainers.

## 📄 License

[Add your license here]

---

**Repository**: [https://github.com/DariaRosen/Shipment-Delay-Predictor](https://github.com/DariaRosen/Shipment-Delay-Predictor)

