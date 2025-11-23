# LogiDog Frontend - Shipment Delay Predictor

> Migrated to Next.js API routes - no backend required!

Frontend application for the LogiDog Shipment Delay Predictor system, built with Next.js 15, TypeScript, and Tailwind CSS.

## Features

- **Real-time Alerts Dashboard**: View at-risk shipments with live updates
- **Advanced Filtering**: Filter by severity, mode, carrier, and search by shipment ID
- **Visual Analytics**: Severity distribution charts and top risk causes
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Type-Safe**: Full TypeScript coverage with shared types

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI (Radix UI primitives)
- **Data Fetching**: React Query (TanStack Query)
- **Charts**: Recharts
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── app/
│   ├── (dashboard)/
│   │   └── alerts/          # Alerts dashboard page
│   ├── layout.tsx           # Root layout with providers
│   └── page.tsx             # Home page
├── components/
│   ├── alerts/              # Alert-specific components
│   ├── charts/              # Chart components
│   ├── providers/           # React Query provider
│   ├── tables/              # Table components
│   └── ui/                  # Shadcn UI components
├── hooks/
│   └── use-alerts.ts        # React Query hooks
├── lib/
│   ├── api-client.ts        # API client functions
│   ├── constants.ts         # App constants
│   └── query-client.ts      # React Query config
└── types/
    └── alerts.ts            # TypeScript types
```

## API Integration

The frontend expects a backend API running at `NEXT_PUBLIC_API_URL` with the following endpoints:

- `GET /api/alerts` - Fetch alerts with optional filters
- `GET /api/alerts/:shipmentId` - Get single alert details
- `POST /api/alerts/acknowledge` - Acknowledge an alert

See `lib/api-client.ts` for implementation details.

## Features in Development

- [ ] Real-time updates via Server-Sent Events (SSE)
- [ ] Alert detail page with timeline
- [ ] User authentication
- [ ] Alert acknowledgment workflow
- [ ] Export functionality
