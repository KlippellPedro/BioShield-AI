import { useEffect, useState } from 'react';

// Re-renderiza a cada `intervalMs` para manter textos como "Há 3 minutos" atualizados.
export function useNow(intervalMs = 30000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
