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
│   ├── app/          # Next.js App Router pages and API routes
│   ├── components/   # React components
│   ├── hooks/        # React Query hooks
│   ├── lib/          # Utilities, services, and API logic
│   └── types/        # TypeScript type definitions
├── scripts/          # Utility scripts
└── README.md         # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (for database)

### Installation

```bash
cd frontend
npm install
```

### Environment Variables

Create a `.env.local` file in the `frontend` directory:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Build

```bash
npm run build
npm start
```

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI (Radix UI primitives)
- **Data Fetching**: React Query (TanStack Query)
- **Charts**: Recharts
- **Database**: Supabase (PostgreSQL)
- **Date Handling**: date-fns

## 📊 Features

- ✅ Alerts dashboard with real-time updates
- ✅ Advanced filtering (severity, mode, carrier, search)
- ✅ Visual analytics (severity distribution, risk causes)
- ✅ Shipment detail pages with timeline
- ✅ Risk factor breakdown with point contributions
- ✅ Responsive design
- ✅ Type-safe with TypeScript

## 📝 API Endpoints

All API routes are implemented as Next.js API routes in `frontend/app/api/`:

- `GET /api/alerts` - Fetch alerts with optional filters
- `GET /api/alerts/:shipmentId` - Get single alert details
- `POST /api/alerts/acknowledge` - Acknowledge an alert
- `POST /api/alerts/recalculate` - Recalculate alert data for all shipments

## 🔍 Delay Detection Logic

The system uses rule-based logic to identify at-risk shipments:

1. **Delay in Steps**: Shipment past expected delivery milestone
2. **Stale Status**: No milestone update for > 24 hours
3. **Customs Hold**: Shipment held at customs
4. **Port Congestion**: Extended dwell time at port
5. **Long Distance**: Very long shipping distance
6. **Peak Season**: Active during holiday season (Nov/Dec)
7. **Weekend Delay**: Stuck during weekend processing
8. **Express Risk**: Express service not meeting timeline

Risk scores are calculated based on these factors and categorized into severity levels: Critical, High, Medium, Low, and Minimal.

## 📚 Documentation

**Complete project documentation is available in the Word document (`text.docx`)** which includes:

- Problem Analysis
- UI Design Reference
- API Design and Sample Data
- Delay Logic Implementation
- Risk Scoring System
- Rules Engine Details

## 🤝 Contributing

This is a project for the LogiDog logistics company. For questions or contributions, please contact the project maintainers.

## 📄 License

[Add your license here]

---

**Repository**: [https://github.com/DariaRosen/Shipment-Delay-Predictor](https://github.com/DariaRosen/Shipment-Delay-Predictor)
