export const REQUEST_ID_HEADER = 'x-request-id';

// Echoed client ids must stay log- and header-safe: a bounded length and a
// conservative charset keep hostile or garbage values out of tracing systems.
const VALID_REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;

/**
 * Returns the id to attach to the response: the incoming client-provided id
 * when it looks sane, otherwise a freshly generated UUID.
 *
 * Uses the Web Crypto global so it runs in the Edge runtime (Next middleware)
 * as well as Node.
 */
export function resolveRequestId(incoming: string | null): string {
  if (incoming && VALID_REQUEST_ID.test(incoming)) {
    return incoming;
  }
  return crypto.randomUUID();
}
