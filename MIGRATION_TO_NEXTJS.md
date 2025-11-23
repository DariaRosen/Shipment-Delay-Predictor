# Migration from NestJS to Next.js API Routes

## Overview
This migration moves the backend API from NestJS (separate server) to Next.js API Routes (same project as frontend).

## Benefits
- ✅ No more Express/NestJS serverless issues
- ✅ Simpler deployment (one project instead of two)
- ✅ Better Vercel integration
- ✅ Same codebase for frontend and backend

## Steps Completed
1. ✅ Created Supabase client utility (`frontend/lib/supabase.ts`)
2. ✅ Created main alerts API route (`frontend/app/api/alerts/route.ts`)
3. ⏳ Need to copy service files from backend to frontend

## Files to Copy

Copy these files from `backend/src/alerts/` to `frontend/lib/services/`:

1. `services/delay-calculator.service.ts` → `services/delay-calculator.ts`
2. `utils/distance-calculator.ts` → `services/distance-calculator.ts`
3. `data/shipment-steps-generator.ts` → `services/shipment-steps-generator.ts`
4. `types/alert-shipment.interface.ts` → `types/alerts.ts` (merge with existing)

## Changes Needed

### 1. Remove NestJS decorators
- Remove `@Injectable()` from service classes
- Remove `@Controller()`, `@Get()`, `@Post()` decorators
- Convert to plain functions/classes

### 2. Update imports
- Change `@nestjs/common` imports to plain TypeScript
- Update relative paths to match new structure

### 3. Create remaining API routes
- `app/api/alerts/[shipmentId]/route.ts` - Get single alert
- `app/api/alerts/acknowledge/route.ts` - Acknowledge alert
- `app/api/alerts/shipments/all/route.ts` - Get all shipments

### 4. Update frontend API client
- Change `NEXT_PUBLIC_API_URL` to use relative paths (`/api` instead of full URL)
- Or remove it entirely since we're in the same project

## Environment Variables

Add to Vercel frontend project:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Remove from backend project (no longer needed).

## Deployment

After migration:
1. Deploy only the frontend project
2. Backend project can be archived/deleted
3. All API calls will go through Next.js API routes

## Quick Start

1. Copy the service files (see above)
2. Remove NestJS decorators
3. Create remaining API routes
4. Update frontend API client
5. Test locally
6. Deploy to Vercel

