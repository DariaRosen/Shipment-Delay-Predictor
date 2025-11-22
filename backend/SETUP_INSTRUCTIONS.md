# Quick Setup Instructions

## Step 1: Get Your Supabase Credentials

1. Go to your Supabase project: **Shipment-Delay-Predictor**
2. Click on **Settings** (gear icon) → **API**
3. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co` (copy this)
   - **service_role key**: Under "Project API keys" → "service_role" (copy this - it's secret!)

## Step 2: Create .env File

In the `backend` directory, create a `.env` file:

```bash
cd backend
```

Create the file and add:

```env
SUPABASE_URL=your_project_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
PORT=3001
```

**Important:** Replace `your_project_url_here` and `your_service_role_key_here` with the actual values from Step 1.

## Step 3: Set Up Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Open `backend/supabase/schema.sql` in your code editor
4. Copy ALL the contents
5. Paste into Supabase SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. You should see "Success. No rows returned"

## Step 4: Install Dependencies & Seed Data

```bash
cd backend
npm install
npm run migrate:supabase
```

This will insert all sample alerts into your database.

## Step 5: Start the Server

```bash
npm run start:dev
```

The API should now be connected to Supabase! 🎉

## Verify It Works

1. Go to Supabase dashboard → **Table Editor**
2. Click on the `alerts` table
3. You should see all the sample alerts

## Troubleshooting

- **"Missing Supabase environment variables"**: Check your `.env` file exists and has correct values
- **"Table does not exist"**: Make sure you ran the schema.sql in SQL Editor
- **Connection errors**: Verify your URL and service role key are correct


