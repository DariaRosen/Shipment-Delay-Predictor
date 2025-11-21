# LogiDog Shipment Delay Backend

NestJS service that powers the LogiDog Shipment Delay Predictor. It exposes alert data, supports filtering, and provides endpoints to acknowledge shipments at risk so the operations team can take action quickly.

## 🧱 Architecture

- **Framework**: NestJS 11 + TypeScript
- **Validation**: `class-validator` + `class-transformer`
- **Data**: In-memory seed (`sample-alerts.ts`) that mirrors the structure expected by the frontend
- **Routing**: Global prefix `/api` (e.g. `http://localhost:3001/api/alerts`)

## 🚀 Getting Started

```bash
cd backend
npm install
npm run start:dev
```

The API will be available at `http://localhost:3001/api`.

### Available Scripts

| Script | Description |
| ------ | ----------- |
| `npm run start` | Start production server |
| `npm run start:dev` | Start dev server with hot reload |
| `npm run start:prod` | Run production build |
| `npm run test` | Execute unit tests |
| `npm run lint` | Run ESLint |

## 🔌 API Endpoints

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/api/health` | Simple health/status payload |
| `GET` | `/api/alerts` | Returns alert list with filtering |
| `GET` | `/api/alerts/:shipmentId` | Returns a single shipment alert |
| `POST` | `/api/alerts/acknowledge` | Marks a shipment as acknowledged |

### Query Parameters (`GET /api/alerts`)

- `severity`: `High` \| `Medium` \| `Low`
- `mode`: `Air` \| `Sea` \| `Road`
- `carrier`: exact carrier name (case-insensitive)
- `search`: partial shipment ID, origin, or destination

### Sample Response

```json
{
  "data": [
    {
      "shipmentId": "LD1001",
      "origin": "Shanghai",
      "destination": "Los Angeles",
      "mode": "Sea",
      "carrierName": "OceanBlue",
      "serviceLevel": "Std",
      "currentStage": "Port Loading",
      "plannedEta": "2024-11-22T18:00:00Z",
      "daysToEta": 3,
      "riskScore": 82,
      "severity": "High",
      "riskReasons": ["StaleStatus", "PortCongestion"],
      "owner": "west-coast-team",
      "acknowledged": false
    }
  ],
  "meta": {
    "lastUpdated": "2024-11-19T12:00:00.000Z",
    "count": 1
  }
}
```

### Acknowledge Payload

```json
POST /api/alerts/acknowledge
{
  "shipmentId": "LD1001",
  "userId": "daria.ops"
}
```

## 🧪 Testing the API

```bash
# Unit tests
npm run test

# e2e tests
npm run test:e2e
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── alerts/               # Alerts module, controller, service, DTOs
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   └── main.ts               # bootstrap, global prefix, validation
├── test/                     # e2e tests (default Nest setup)
└── package.json
```

## 🔄 Next Steps

- Replace in-memory `sampleAlerts` with PostgreSQL/Redis sources
- Wire real-time updates via SSE/WebSockets
- Implement rule engine + ML scoring inputs
- Add authentication and per-user acknowledgements

---

Part of the [Shipment-Delay-Predictor](https://github.com/DariaRosen/Shipment-Delay-Predictor) monorepo. Use alongside the Next.js frontend for a full-stack experience.
