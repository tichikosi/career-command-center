import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/discovery/reverify/route';

describe('V3.2 Re-verify Service & Deterministic Validation', () => {
  it('returns 400 Bad Request if required parameters are missing', async () => {
    const req = new Request('http://localhost:3000/api/discovery/reverify', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Missing required parameters');
  });

  it('marks job as unverified-legacy if no jobUrl is present', async () => {
    const req = new Request('http://localhost:3000/api/discovery/reverify', {
      method: 'POST',
      body: JSON.stringify({
        id: 'job-legacy-1',
        title: 'VP of Strategy',
        company: 'Stripe',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.verificationStatus).toBe('unverified-legacy');
    expect(data.failureReason).toContain('No source URL available');
  });

  it('correctly reports expired / unreachable when URL validator blocks unsafe or dead domains', async () => {
    const req = new Request('http://localhost:3000/api/discovery/reverify', {
      method: 'POST',
      body: JSON.stringify({
        id: 'job-unsafe-1',
        title: 'VP Engineering',
        company: 'DarkWeb Corp',
        jobUrl: 'http://127.0.0.1:8080/admin', // SSRF target
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.verificationStatus).toBe('unreachable');
  });
});
