import { useState, useCallback } from 'react';

/**
 * Generic hook for async operations with loading and error state.
 *
 * Usage:
 *   const { run, loading, error, data } = useAsync();
 *   await run(() => apiFn(args));
 *
 * Or with an immediate call:
 *   const { loading, error, data } = useAsync(() => fetchSomething(), [dep]);
 */
export function useAsync(fn, deps = []) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [data,    setData]    = useState(null);

  const run = useCallback(async (overrideFn) => {
    const target = overrideFn ?? fn;
    if (!target) return;

    setLoading(true);
    setError(null);
    try {
      const result = await target();
      setData(result);
      return result;
    } catch (err) {
      const message = err?.message || 'Something went wrong';
      setError(message);
      console.error('[useAsync]', message, err);
      throw err;
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { run, loading, error, data };
}
