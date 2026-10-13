import { DependencyList, useCallback, useEffect, useRef, useState } from 'react';
import { Page } from '../types';

// Lista paginada por cursor ("Carregar mais"). Recarrega do início quando as dependências mudam.
export function usePagedList<T>(fetchPage: (cursor?: string) => Promise<Page<T>>, deps: DependencyList) {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const load = useCallback(
    async (next?: string) => {
      const gen = ++generation.current;
      setLoading(true);
      setError(null);
      try {
        const page = await fetchPage(next);
        if (gen !== generation.current) return;
        setItems((prev) => (next ? [...prev, ...page.items] : page.items));
        setCursor(page.next_cursor);
      } catch (e) {
        if (gen !== generation.current) return;
        setError(e instanceof Error ? e.message : 'Falha ao carregar.');
      } finally {
        if (gen === generation.current) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  useEffect(() => {
    void load();
  }, [load]);

  return {
    items,
    loading,
    error,
    hasMore: cursor !== null,
    loadMore: () => (cursor ? load(cursor) : Promise.resolve()),
    reload: () => load(),
  };
}
