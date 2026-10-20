import { authenticatedUser, createSession, hashPassword, revokeSession, sessionCookie, validateCredentials, verifyPassword } from '@/lib/auth';
import { consumeAuthLimit, createUser, findUserByEmail, upgradeGuest } from '@/lib/db';
import { GameError } from '@/lib/game';
import { assertSameOrigin, errorResponse, json, readJson } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = await readJson(request);
    const action = input.action;
    if (!['guest', 'login', 'register', 'logout'].includes(String(action))) throw new GameError('Ação de acesso inválida.');
    if (action === 'logout') {
      revokeSession(request);
      return json({ ok: true }, 200, { 'set-cookie': sessionCookie(request, null) });
    }
    const existing = authenticatedUser(request);
    if (action === 'guest' && existing) return json({ ok: true });
    const address = request.headers.get('x-forwarded-for')?.split(',')[0].trim().slice(0, 100) ?? 'local';
    if (!consumeAuthLimit(`ip:${address}`, 60)) throw new GameError('Muitas tentativas. Aguarde alguns minutos.', 429);
    if (action === 'guest') {
      const user = createUser('Viajante');
      return json({ ok: true }, 200, { 'set-cookie': sessionCookie(request, createSession(user.id)) });
    }
    const credentials = validateCredentials(input, action === 'register');
    if (!consumeAuthLimit(`email:${credentials.email}`, 12)) throw new GameError('Muitas tentativas para este e-mail. Tente em 15 minutos.', 429);
    if (action === 'register') {
      if (findUserByEmail(credentials.email)) throw new GameError('Este e-mail já tem uma conta. Entre para continuar.', 409);
      const passwordHash = await hashPassword(credentials.password);
      let user;
      try {
        user = existing?.is_guest
          ? upgradeGuest(existing.id, credentials.name, credentials.email, passwordHash)
          : createUser(credentials.name, credentials.email, passwordHash);
      } catch (error) {
        if (error instanceof Error && error.message.includes('UNIQUE')) throw new GameError('Este e-mail já tem uma conta.', 409);
        throw error;
      }
      revokeSession(request);
      return json({ ok: true }, 200, { 'set-cookie': sessionCookie(request, createSession(user.id)) });
    }
    const user = findUserByEmail(credentials.email);
    // Perform the same expensive derivation when the account is absent.
    const fallback = `scrypt$00000000000000000000000000000000$${'0'.repeat(128)}`;
    const valid = await verifyPassword(credentials.password, user?.password_hash ?? fallback);
    if (!valid || !user) throw new GameError('E-mail ou senha incorretos.', 401);
    revokeSession(request);
    return json({ ok: true }, 200, { 'set-cookie': sessionCookie(request, createSession(user.id)) });
  } catch (error) { return errorResponse(error); }
}
