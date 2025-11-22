# Supabase Setup Guide

This guide will help you set up Supabase for the LogiDog Shipment Delay Predictor backend.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in your project details:
   - **Name**: LogiDog Backend (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose the closest region to your users
5. Click "Create new project"
6. Wait for the project to be created (takes ~2 minutes)

## Step 2: Get Your Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (under "Project URL")
   - **service_role key** (under "Project API keys" → "service_role" - keep this secret!)

## Step 3: Configure Environment Variables

1. In the `backend` directory, create a `.env` file:
```bash
cd backend
cp .env.example .env
```

2. Edit `.env` and add your credentials:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
PORT=3001
```

## Step 4: Create Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Open the file `backend/supabase/schema.sql` in your code editor
4. Copy the entire contents of `schema.sql`
5. Paste it into the Supabase SQL Editor
6. Click "Run" (or press Ctrl+Enter)
7. You should see "Success. No rows returned"

## Step 5: Seed Sample Data

1. Make sure your `.env` file is configured correctly
2. Run the migration script:
```bash
npm run migrate:supabase
```

This will insert all sample alerts from `sample-alerts.ts` into your Supabase database.

## Step 6: Verify Setup

1. In Supabase dashboard, go to **Table Editor**
2. You should see the `alerts` table
3. Click on it to view the data
4. You should see all the sample alerts

## Step 7: Start the Backend

```bash
npm run start:dev
```

The API should now be using Supabase instead of in-memory data!

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure your `.env` file exists in the `backend` directory
- Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set correctly

### "Failed to fetch alerts"
- Verify your Supabase URL and key are correct
- Check that the schema was created successfully
- Make sure the `alerts` table exists in your Supabase dashboard

### Migration script fails
- Ensure you've run the schema.sql in Supabase SQL Editor first
- Check that your service role key has the correct permissions
- Verify the sample data format matches the schema

## Next Steps

- Set up Row Level Security (RLS) policies for production
- Configure authentication if needed
- Set up real-time subscriptions for live updates
- Add database backups

