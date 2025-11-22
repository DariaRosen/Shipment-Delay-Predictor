# How to Start the Backend Server

## Quick Start

**Option 1: Using PowerShell script**
```powershell
cd backend
.\start-server.ps1
```

**Option 2: Using npm directly**
```bash
cd backend
npm run start:dev
```

## What to Look For

When the server starts successfully, you should see:
```
🚀 Backend running on http://localhost:3001/api
```

## Troubleshooting

### If you see "Missing Supabase environment variables"
- Make sure `.env` file exists in the `backend` directory
- Check that it contains:
  ```
  SUPABASE_URL=https://cmmailctlxhzatanxdwt.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
  PORT=3001
  ```

### If you see connection errors
- Verify your Supabase credentials are correct
- Make sure the database schema was created (run `schema.sql` in Supabase SQL Editor)
- Check that data was migrated (run `npm run migrate:supabase`)

### If port 3001 is already in use
- Stop any other process using port 3001
- Or change the PORT in `.env` file

## Keep the Terminal Open

**Important:** The server must keep running in the terminal. Don't close the terminal window while developing!

The frontend at `http://localhost:3000` needs the backend at `http://localhost:3001` to be running.

