import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/discovery/cron/route';

describe('V3.2 Scheduled Discovery Cron Route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('rejects unauthorized requests when CRON_SECRET is configured', async () => {
    process.env.CRON_SECRET = 'super-secret-cron-token-12345';

    const req = new NextRequest('http://localhost:3000/api/discovery/cron', {
      method: 'GET',
      headers: {
        authorization: 'Bearer wrong-token',
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('Unauthorized cron request');
  });

  it('accepts valid Bearer token authorization matching CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'valid-token-xyz';

    const req = new NextRequest('http://localhost:3000/api/discovery/cron', {
      method: 'GET',
      headers: {
        authorization: 'Bearer valid-token-xyz',
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('accepts x-cron-secret header matching CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'valid-token-xyz';

    const req = new NextRequest('http://localhost:3000/api/discovery/cron', {
      method: 'GET',
      headers: {
        'x-cron-secret': 'valid-token-xyz',
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('rejects in production when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;
    (process.env as { NODE_ENV?: string }).NODE_ENV = 'production';

    const req = new NextRequest('http://localhost:3000/api/discovery/cron', {
      method: 'GET',
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('CRON_SECRET must be configured in production');
  });
});
