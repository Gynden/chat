import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertSameOrigin, readJson } from '../src/lib/http';
import { hashPassword, verifyPassword, tokenHash, readSessionToken, createSession, authenticatedUser, revokeSession, sessionCookie, validateCredentials } from '../src/lib/auth';
import { consumeAuthLimit, createUser, getDatabase, updateGame, upgradeGuest } from '../src/lib/db';

process.env.GAME_DATA_DIR = mkdtempSync(join(tmpdir(), 'ruptura-tests-'));
test('scrypt hashes use independent salts and validate only correct passwords', async () => {
  const password = 'correct horse battery 42';
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(first.includes(password), false);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword('wrong password', first), false);
  assert.equal(await verifyPassword(password, 'malformed'), false);
});
test('origin checks reject cross-origin form/JSON requests and malformed JSON', async () => {
  assert.throws(() => assertSameOrigin(new Request('http://localhost/api/game/actions', { method: 'POST', headers: { origin: 'https://evil.test', 'content-type': 'application/json' } })), /Origem/);
  assert.throws(() => assertSameOrigin(new Request('http://localhost/api/game/actions', { method: 'POST', headers: { 'content-type': 'text/plain' } })), /JSON/);
  assertSameOrigin(new Request('http://localhost/api/game/actions', { method: 'POST', headers: { origin: 'http://localhost', 'content-type': 'application/json' } }));
  await assert.rejects(readJson(new Request('http://localhost', { method: 'POST', body: '{broken' })), /JSON inválido/);
  await assert.rejects(readJson(new Request('http://localhost', { method: 'POST', body: '[]' })), /JSON inválido/);
});
test('sessions store only hashed tokens and expire/revoke correctly', () => {
  const now = Date.now();
  const user = createUser('Viajante', null, null, now);
  const token = createSession(user.id, now);
  const request = new Request('http://localhost/api/game', { headers: { cookie: `ruptura_session=${token}` } });
  const row = getDatabase().prepare('SELECT token_hash FROM sessions WHERE user_id=?').get(user.id) as { token_hash: string };
  assert.equal(row.token_hash, tokenHash(token));
  assert.notEqual(row.token_hash, token);
  assert.equal(authenticatedUser(request, now)?.id, user.id);
  assert.equal(authenticatedUser(request, now + 31 * 86_400_000), null);
  assert.equal(readSessionToken(new Request('http://localhost', { headers: { cookie: 'ruptura_session=forged' } })), null);
  assert.match(sessionCookie(new Request('https://example.test'), token), /HttpOnly; SameSite=Lax;.*Secure/);
  revokeSession(request);
  assert.equal(authenticatedUser(request, now), null);
});
test('a guest can become an account without losing the same persisted journey', () => {
  const user = createUser('Viajante');
  updateGame(user.id, state => { state.gold = 987; });
  const upgraded = upgradeGuest(user.id, 'Explorador', 'journey@example.test', 'test-only-hash');
  assert.equal(upgraded.id, user.id);
  assert.equal(upgraded.is_guest, 0);
  assert.equal(updateGame(user.id, state => state.gold), 987);
});
test('failed transactions cannot partially spend resources', () => {
  const user = createUser('Viajante');
  assert.throws(() => updateGame(user.id, state => { state.gold = 0; throw new Error('failed operation'); }));
  assert.equal(updateGame(user.id, state => state.gold), 220);
});
test('auth attempts are rate-limited and reset only after the configured window', () => {
  assert.equal(consumeAuthLimit('test-email', 2, 100_000, 1000), true);
  assert.equal(consumeAuthLimit('test-email', 2, 100_001, 1000), true);
  assert.equal(consumeAuthLimit('test-email', 2, 100_002, 1000), false);
  assert.equal(consumeAuthLimit('test-email', 2, 101_001, 1000), true);
});
test('credentials require valid normalized identity and bounded password length', () => {
  assert.equal(validateCredentials({ email: ' EXAMPLE@Mail.test ', password: 'password123', name: ' Test ' }, true).email, 'example@mail.test');
  assert.throws(() => validateCredentials({ email: 'bad', password: 'password123' }, false));
  assert.throws(() => validateCredentials({ email: 'a@b.test', password: 'short' }, false));
});

test('JSON parser limits bytes even when Content-Length is missing or misleading', async () => {
  const oversized = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ text: 'a'.repeat(5000) }) });
  await assert.rejects(readJson(oversized), /muito grande/);
  const unicode = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ text: 'é'.repeat(2500) }) });
  await assert.rejects(readJson(unicode), /muito grande/);
});

test('origin validation uses browser Host when Next URL contains its bind address', () => {
  const local = new Request('http://0.0.0.0:3001/api/auth', { method: 'POST', headers: { host: 'localhost:3001', origin: 'http://localhost:3001', 'content-type': 'application/json' } });
  assertSameOrigin(local);
  const proxied = new Request('https://0.0.0.0:3001/api/auth', { method: 'POST', headers: { host: 'game.example.test', origin: 'https://game.example.test', 'content-type': 'application/json' } });
  assertSameOrigin(proxied);
  const forgedForwarded = new Request('http://0.0.0.0:3001/api/auth', { method: 'POST', headers: { host: 'localhost:3001', 'x-forwarded-host': 'evil.example', origin: 'https://evil.example', 'content-type': 'application/json' } });
  assert.throws(() => assertSameOrigin(forgedForwarded), /Origem/);
  const wrongProtocol = new Request('http://0.0.0.0:3001/api/auth', { method: 'POST', headers: { host: 'localhost:3001', origin: 'https://localhost:3001', 'content-type': 'application/json' } });
  assert.throws(() => assertSameOrigin(wrongProtocol), /Origem/);
  const invalidHost = new Request('http://0.0.0.0:3001/api/auth', { method: 'POST', headers: { host: 'user@localhost:3001', origin: 'http://localhost:3001', 'content-type': 'application/json' } });
  assert.throws(() => assertSameOrigin(invalidHost), /Host/);
});
