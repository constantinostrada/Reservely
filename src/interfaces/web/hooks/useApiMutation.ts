'use client';

/**
 * Data-fetching convention for write operations:
 *
 *   const login = useApiMutation(api.auth.login);
 *   const result = await login.mutate({ email, password });
 *   if (result) { ... success ... }
 *
 * `mutate` resolves with the result on success and with `undefined` on
 * failure, storing the error in `mutation.error` for the screen to render.
 * Unlike queries, a 401 is surfaced (not redirected) — for login itself it
 * means "wrong credentials", which the form must show.
 */
import { useCallback, useRef, useState } from 'react';
import { toError } from '../api/http';

export interface UseApiMutationResult<TInput, TResult> {
  mutate: (input: TInput) => Promise<TResult | undefined>;
  isPending: boolean;
  error: Error | undefined;
  reset: () => void;
}

export function useApiMutation<TInput, TResult>(
  mutator: (input: TInput) => Promise<TResult>
): UseApiMutationResult<TInput, TResult> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const mutatorRef = useRef(mutator);
  mutatorRef.current = mutator;

  const mutate = useCallback(async (input: TInput) => {
    setIsPending(true);
    setError(undefined);
    try {
      return await mutatorRef.current(input);
    } catch (err) {
      setError(toError(err));
      return undefined;
    } finally {
      setIsPending(false);
    }
  }, []);

  const reset = useCallback(() => setError(undefined), []);

  return { mutate, isPending, error, reset };
}
