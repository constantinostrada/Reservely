'use client';

/**
 * Data-fetching convention for read operations:
 *
 *   const query = useApiQuery(() => api.tables.list(), []);
 *
 * Screens branch on `query.isLoading` / `query.error` / `query.data` and call
 * `query.refetch()` after a mutation changes what they display. An expired
 * session (401) redirects to /login from here, so screens never handle it.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, toError } from '../api/http';

export type QueryStatus = 'loading' | 'success' | 'error';

export interface UseApiQueryResult<T> {
  data: T | undefined;
  error: Error | undefined;
  status: QueryStatus;
  isLoading: boolean;
  refetch: () => void;
}

export function useApiQuery<T>(
  fetcher: () => Promise<T>,
  deps: readonly unknown[]
): UseApiQueryResult<T> {
  const router = useRouter();
  const [state, setState] = useState<{
    status: QueryStatus;
    data?: T;
    error?: Error;
  }>({ status: 'loading' });
  const [tick, setTick] = useState(0);

  // Latest fetcher without making it a dependency (callers pass inline arrows)
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    fetcherRef.current().then(
      (data) => {
        if (!cancelled) {
          setState({ status: 'success', data });
        }
      },
      (error: unknown) => {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && error.isUnauthorized) {
          router.replace('/login');
          return;
        }
        setState({ status: 'error', error: toError(error) });
      }
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, router, ...deps]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return {
    data: state.data,
    error: state.error,
    status: state.status,
    isLoading: state.status === 'loading',
    refetch,
  };
}
