import { NextResponse } from 'next/server';
import prisma from '@/src/infrastructure/database/prisma';

/**
 * Public liveness probe for uptime monitoring (no auth). Pings the database
 * with the cheapest possible query; anything the DB throws maps to a 503 so
 * monitors see the outage. No error details are echoed — this endpoint is
 * unauthenticated.
 */
export async function GET(): Promise<NextResponse> {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({ status: 'ok', db: 'up' });
  } catch {
    return NextResponse.json({ status: 'error', db: 'down' }, { status: 503 });
  }
}
