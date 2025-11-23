# Vercel Deployment Guide

This project has two separate deployments: **Frontend** (Next.js) and **Backend** (NestJS). Both should be deployed as separate projects in your Vercel dashboard at [vercel.com/daria-rosens-projects](https://vercel.com/daria-rosens-projects).

## Deploy Frontend

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Deploy to Vercel:
```bash
npx vercel
```

3. Follow the prompts:
   - Login to Vercel (opens browser if not logged in)
   - Link to existing project or create new one (e.g., `shipment-delay-frontend`)
   - Confirm settings

4. Set environment variables in Vercel Dashboard:
   - Go to your project → Settings → Environment Variables
   - Add: `NEXT_PUBLIC_API_URL` = `https://your-backend-project.vercel.app/api`
     - ⚠️ You'll need to deploy the backend first to get this URL, then update this value

5. Production deploy:
```bash
npx vercel --prod
```

## Deploy Backend

1. Navigate to the backend directory:
```bash
cd backend
```

2. Deploy to Vercel:
```bash
npx vercel
```

3. Follow the prompts:
   - Login to Vercel (if not already logged in)
   - Link to existing project or create new one (e.g., `shipment-delay-backend`)
   - Confirm settings

4. Set environment variables in Vercel Dashboard:
   - Go to your project → Settings → Environment Variables
   - Add:
     - `SUPABASE_URL` = Your Supabase project URL
     - `SUPABASE_SERVICE_ROLE_KEY` = Your Supabase service role key
     - `FRONTEND_URL` = `https://your-frontend-project.vercel.app` (optional, for CORS)

5. Production deploy:
```bash
npx vercel --prod
```

## Post-Deployment Steps

1. **Update Frontend API URL**:
   - After backend is deployed, update `NEXT_PUBLIC_API_URL` in frontend's Vercel environment variables
   - Redeploy frontend: `cd frontend && npx vercel --prod`

2. **Verify CORS**:
   - Backend CORS is configured to allow the frontend URL automatically
   - If you have issues, check that `FRONTEND_URL` env var is set in backend

## Project Structure in Vercel

You should see two projects in [vercel.com/daria-rosens-projects](https://vercel.com/daria-rosens-projects):
- `shipment-delay-frontend` (or your chosen name)
- `shipment-delay-backend` (or your chosen name)

## Troubleshooting

- **Backend not responding**: Check that environment variables are set correctly
- **CORS errors**: Ensure `FRONTEND_URL` is set in backend and matches your frontend URL
- **Build failures**: Check build logs in Vercel dashboard for specific errors

