/**
 * Health check endpoint (B15): public probe for uptime monitoring.
 * 200 { status: "ok", db: "up" } when the DB answers a SELECT 1 ping,
 * 503 { status: "error", db: "down" } when it doesn't. The prisma singleton
 * is mocked so both paths run without a database.
 */
import { GET as health } from '@/app/api/health/route';
import prisma from '@/src/infrastructure/database/prisma';

jest.mock('@/src/infrastructure/database/prisma', () => ({
  __esModule: true,
  default: { $queryRaw: jest.fn() },
}));

const queryRaw = prisma.$queryRaw as jest.Mock;

describe('GET /api/health', () => {
  it('returns 200 with { status: "ok", db: "up" } when the DB responds', async () => {
    queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

    const response = await health();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', db: 'up' });
  });

  it('returns 503 with db "down" when the DB ping fails', async () => {
    queryRaw.mockRejectedValueOnce(new Error('connection refused'));

    const response = await health();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'error', db: 'down' });
  });
});
