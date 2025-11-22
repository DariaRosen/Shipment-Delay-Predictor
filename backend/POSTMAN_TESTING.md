# Testing with Postman

## Import the Collection

1. Open Postman
2. Click **Import** (top left)
3. Select the file: `backend/postman-collection.json`
4. The collection "LogiDog Shipment Delay API" will appear

## Prerequisites

**IMPORTANT:** The backend server must be running before testing!

1. Start the backend server:
   ```bash
   cd backend
   npm run start:dev
   ```

2. Wait for: `🚀 Backend running on http://localhost:3001/api`

## Test Endpoints

### 1. Health Check
- **GET** `http://localhost:3001/api/health`
- Should return a simple status response

### 2. Get All Alerts
- **GET** `http://localhost:3001/api/alerts`
- Should return all alerts from Supabase
- Expected: JSON with `data` array and `meta` object

### 3. Filter by Severity
- **GET** `http://localhost:3001/api/alerts?severity=High`
- Should return only High severity alerts

### 4. Filter by Mode
- **GET** `http://localhost:3001/api/alerts?mode=Air`
- Should return only Air mode alerts

### 5. Search
- **GET** `http://localhost:3001/api/alerts?search=LD1001`
- Should return alerts matching the search term

### 6. Get Single Alert
- **GET** `http://localhost:3001/api/alerts/LD1001`
- Should return a single alert by shipment ID

### 7. Acknowledge Alert
- **POST** `http://localhost:3001/api/alerts/acknowledge`
- Body (JSON):
  ```json
  {
    "shipmentId": "LD1001",
    "userId": "test.user"
  }
  ```
- Should return acknowledgment confirmation

## Troubleshooting

### "Could not get any response"
- **Server is not running!** Start it with `npm run start:dev`
- Check that you see the "Backend running" message

### "ERR_CONNECTION_REFUSED"
- Server is not listening on port 3001
- Make sure the server started successfully
- Check for error messages in the server terminal

### "Missing Supabase environment variables"
- Check that `.env` file exists in `backend/` directory
- Verify it contains `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### Empty response or no data
- Verify data was migrated: `npm run migrate:supabase`
- Check Supabase dashboard → Table Editor → alerts table has data

## Expected Response Format

```json
{
  "data": [
    {
      "shipmentId": "LD1001",
      "origin": "Shanghai",
      "destination": "Los Angeles",
      "mode": "Sea",
      "carrierName": "OceanBlue",
      "riskScore": 82,
      "severity": "High",
      "riskReasons": ["StaleStatus", "PortCongestion"],
      ...
    }
  ],
  "meta": {
    "lastUpdated": "2024-11-22T12:00:00.000Z",
    "count": 15
  }
}
```

