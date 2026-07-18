/**
 * X-Request-Id tagging (B16): every API response carries an X-Request-Id —
 * echoed when the client sends a sane one, generated otherwise. Exercises the
 * real global middleware so the /api matching and header wiring are covered,
 * not just the helper.
 */
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import {
  REQUEST_ID_HEADER,
  resolveRequestId,
} from '@interfaces/http/middleware/requestId';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('API request-id middleware', () => {
  it('attaches a generated X-Request-Id when the client sends none', () => {
    const response = middleware(
      new NextRequest('http://localhost/api/health')
    );

    expect(response.headers.get(REQUEST_ID_HEADER)).toMatch(UUID_PATTERN);
  });

  it('echoes an X-Request-Id sent by the client', () => {
    const response = middleware(
      new NextRequest('http://localhost/api/reservations', {
        headers: { [REQUEST_ID_HEADER]: 'client-trace_0042' },
      })
    );

    expect(response.headers.get(REQUEST_ID_HEADER)).toBe('client-trace_0042');
  });

  it('forwards the id on the request so handlers can log it', () => {
    const response = middleware(
      new NextRequest('http://localhost/api/orders', {
        headers: { [REQUEST_ID_HEADER]: 'client-trace_0042' },
      })
    );

    // NextResponse.next({ request }) exposes overridden request headers with
    // this prefix; it's how Next hands them to the route handler.
    expect(
      response.headers.get(`x-middleware-request-${REQUEST_ID_HEADER}`)
    ).toBe('client-trace_0042');
  });

  it('generates distinct ids per request', () => {
    const first = middleware(new NextRequest('http://localhost/api/health'));
    const second = middleware(new NextRequest('http://localhost/api/health'));

    expect(first.headers.get(REQUEST_ID_HEADER)).not.toBe(
      second.headers.get(REQUEST_ID_HEADER)
    );
  });

  it('replaces malformed client ids instead of echoing them', () => {
    expect(resolveRequestId('bad id with spaces')).toMatch(UUID_PATTERN);
    expect(resolveRequestId('a'.repeat(200))).toMatch(UUID_PATTERN);
    expect(resolveRequestId(null)).toMatch(UUID_PATTERN);
  });
});
