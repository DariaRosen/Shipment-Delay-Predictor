import { NextResponse } from 'next/server';
import { clearAcknowledgements } from '@/lib/test-data-store';

export async function POST() {
  clearAcknowledgements();
  return NextResponse.json({
    success: true,
    updated: 0,
    message: 'Test data regenerated on every request; acknowledgements reset.',
  });
}

