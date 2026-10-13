// Camada HTTP do painel. A sessão é um cookie httpOnly: o JavaScript não vê o token de sessão.
// Requisições que alteram estado levam o X-CSRF-Token entregue pelo backend (docs/openapi.yaml).

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

let csrfToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const setCsrfToken = (token: string | null) => {
  csrfToken = token;
};

// Chamado quando uma rota protegida responde 401 (sessão expirada ou encerrada).
export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler;
};

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  signal?: AbortSignal;
  // Rotas de login respondem 401 para credencial errada: isso não é "sessão expirada".
  public?: boolean;
}

async function send(path: string, opts: RequestOptions): Promise<Response> {
  const method = opts.method ?? 'GET';
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken;

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ApiError(0, 'NETWORK', 'Não foi possível contatar o servidor.');
  }

  if (!res.ok) {
    if (res.status === 401 && !opts.public) onUnauthorized?.();
    let code = 'ERROR';
    let message = `Erro ${res.status}.`;
    try {
      const body = await res.json();
      if (typeof body?.error === 'string') message = body.error;
      if (typeof body?.code === 'string') code = body.code;
    } catch {
      // resposta sem corpo JSON
    }
    throw new ApiError(res.status, code, message);
  }
  return res;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const res = await send(path, opts);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// Imagens e PDFs: dado pessoal, vêm do servidor com Cache-Control: no-store.
export async function requestBlob(path: string, signal?: AbortSignal): Promise<Blob> {
  const res = await send(path, { signal });
  return res.blob();
}
