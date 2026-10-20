import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { findUser, getDatabase, type UserRow } from './db';
import { GameError } from './game';

const deriveKey = promisify(scrypt);
export const SESSION_COOKIE = 'ruptura_session';
const SESSION_SECONDS = 60 * 60 * 24 * 30;
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await deriveKey(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${key.toString('hex')}`;
}
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [algorithm, salt, encoded] = hash.split('$');
  if (algorithm !== 'scrypt' || !salt || !encoded || encoded.length !== 128) return false;
  const key = await deriveKey(password, salt, 64) as Buffer;
  const expected = Buffer.from(encoded, 'hex');
  return expected.length === key.length && timingSafeEqual(expected, key);
}
export function tokenHash(token: string): string { return createHash('sha256').update(token).digest('hex'); }
export function readSessionToken(request: Request): string | null {
  const cookies = request.headers.get('cookie') ?? '';
  const token = cookies.split(';').map(value => value.trim()).find(value => value.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}
export function authenticatedUser(request: Request, now = Date.now()): UserRow | null {
  const token = readSessionToken(request);
  if (!token) return null;
  const session = getDatabase().prepare('SELECT user_id,expires_at FROM sessions WHERE token_hash=?').get(tokenHash(token)) as { user_id: string; expires_at: number } | undefined;
  if (!session || session.expires_at <= now) return null;
  return findUser(session.user_id) ?? null;
}
export function requireUser(request: Request): UserRow {
  const user = authenticatedUser(request);
  if (!user) throw new GameError('Entre para continuar sua jornada.', 401);
  return user;
}
export function createSession(userId: string, now = Date.now()): string {
  const token = randomBytes(32).toString('base64url');
  getDatabase().prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
  getDatabase().prepare('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)').run(tokenHash(token), userId, now + SESSION_SECONDS * 1000);
  return token;
}
export function revokeSession(request: Request) {
  const token = readSessionToken(request);
  if (token) getDatabase().prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash(token));
}
export function sessionCookie(request: Request, token: string | null): string {
  const secure = new URL(request.url).protocol === 'https:';
  return `${SESSION_COOKIE}=${token ?? ''}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token ? SESSION_SECONDS : 0}${secure ? '; Secure' : ''}`;
}
export function validateCredentials(input: Record<string, unknown>, register: boolean) {
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new GameError('Informe um e-mail válido.');
  if (password.length < 8 || password.length > 128) throw new GameError('A senha precisa ter entre 8 e 128 caracteres.');
  if (register && (name.length < 2 || name.length > 32)) throw new GameError('Use um nome com 2 a 32 caracteres.');
  return { email, password, name };
}
