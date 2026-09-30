import { useEffect, useState } from "react";

interface DotCMSState<T> {
  data?: T;
  error?: string;
  loading: boolean;
  /** True while a pull-to-refresh is running. */
  refreshing: boolean;
  refresh: () => void;
}

/**
 * Load something from dotCMS when the screen mounts, and again on
 * pull-to-refresh — handy in a demo: change content in dotCMS, pull down,
 * and the app shows it. `load` should be stable (a module function or
 * wrapped in useCallback), or it reloads on every render.
 */
export function useDotCMS<T>(load: () => Promise<T>): DotCMSState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Bumped by refresh(); each change runs the effect again.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    load()
      .then((result) => {
        if (!current) return;
        setData(result);
        setError(undefined);
      })
      .catch((e: Error) => current && setError(e.message))
      .finally(() => {
        if (!current) return;
        setLoading(false);
        setRefreshing(false);
      });
    return () => {
      current = false;
    };
  }, [load, attempt]);

  const refresh = () => {
    setRefreshing(true);
    setAttempt((n) => n + 1);
  };

  return { data, error, loading, refreshing, refresh };
}
