import { GameError } from './game';

export function json(body: unknown, status = 200, headers?: HeadersInit): Response {
  const output = new Headers(headers);
  output.set('content-type', 'application/json; charset=utf-8');
  output.set('cache-control', 'no-store');
  output.set('x-content-type-options', 'nosniff');
  return new Response(JSON.stringify(body), { status, headers: output });
}
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const target = new URL(request.url);
  let expectedOrigin = target.origin;
  const host = request.headers.get('host');
  // Next constructs request.url using its bind address (often 0.0.0.0), which
  // differs from the browser origin. Host is supplied by the browser and normally
  // preserved by the reverse proxy; never implicitly trust X-Forwarded-Host.
  if (host) {
    if (/[\s/\\?#@,]/.test(host)) throw new GameError('Host da solicitação inválido.', 403);
    try {
      const publicTarget = new URL(`${target.protocol}//${host}`);
      if (!publicTarget.hostname) throw new Error('missing host');
      expectedOrigin = publicTarget.origin;
    } catch { throw new GameError('Host da solicitação inválido.', 403); }
  }
  if (origin && origin !== expectedOrigin) throw new GameError('Origem da solicitação não permitida.', 403);
  if (request.headers.get('sec-fetch-site') === 'cross-site') throw new GameError('Origem da solicitação não permitida.', 403);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new GameError('Envie uma solicitação JSON.', 415);
}
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (Number(request.headers.get('content-length')) > 4096) throw new GameError('Solicitação muito grande.', 413);
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        throw new GameError('Solicitação muito grande.', 413);
      }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const data: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('not object');
    return data as Record<string, unknown>;
  } catch { throw new GameError('JSON inválido.'); }
}
export function errorResponse(error: unknown): Response {
  if (error instanceof GameError) return json({ error: error.message }, error.status);
  // Server errors are deliberately opaque; never return database contents, credentials, or stack traces.
  console.error('Ruptura API failure:', error instanceof Error ? error.message : 'unknown error');
  return json({ error: 'Não foi possível concluir. Tente novamente.' }, 500);
}
