import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { GET as getGame } from '../src/app/api/game/route';
import { POST as auth } from '../src/app/api/auth/route';
import { POST as gameAction } from '../src/app/api/game/actions/route';
import { updateGame } from '../src/lib/db';
import type { GameSnapshot } from '../src/lib/types';

process.env.GAME_DATA_DIR = mkdtempSync(join(tmpdir(), 'ruptura-api-tests-'));
function request(path: string, body?: unknown, cookie?: string, origin = 'http://localhost') {
  return new Request(`http://localhost${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { ...(body ? { 'content-type': 'application/json', origin } : {}), ...(cookie ? { cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
function cookieFrom(response: Response): string { return response.headers.get('set-cookie')!.split(';')[0]; }

test('API persists guest journey, rejects forged values, upgrades and rotates/revokes sessions', async () => {
  assert.equal((await getGame(request('/api/game'))).status, 401);
  const guest = await auth(request('/api/auth', { action: 'guest' }));
  assert.equal(guest.status, 200);
  const guestCookie = cookieFrom(guest);
  let snapshot = await (await getGame(request('/api/game', undefined, guestCookie))).json() as GameSnapshot;
  const id = snapshot.player.id;
  assert.equal(snapshot.character.level, 1);
  assert.equal(snapshot.player.isGuest, true);
  assert.equal('password' in snapshot.player, false);
  assert.equal((await gameAction(request('/api/game/actions', { action: 'train', gold: 999_999 }, guestCookie))).status, 400);
  const trained = await gameAction(request('/api/game/actions', { action: 'train' }, guestCookie));
  assert.equal(trained.status, 200);
  snapshot = await trained.json() as GameSnapshot;
  assert.equal(snapshot.player.gold, 150);
  assert.equal(snapshot.character.trainingLevel, 1);
  assert.equal((await gameAction(request('/api/game/actions', { action: 'equip', itemId: 'another-account-item' }, guestCookie))).status, 400);
  const registered = await auth(request('/api/auth', { action: 'register', name: 'Explorador', email: 'explorador@example.test', password: 'password12345' }, guestCookie));
  assert.equal(registered.status, 200);
  const accountCookie = cookieFrom(registered);
  assert.notEqual(accountCookie, guestCookie);
  assert.equal((await getGame(request('/api/game', undefined, guestCookie))).status, 401);
  snapshot = await (await getGame(request('/api/game', undefined, accountCookie))).json() as GameSnapshot;
  assert.equal(snapshot.player.id, id);
  assert.equal(snapshot.player.isGuest, false);
  assert.equal(snapshot.character.trainingLevel, 1);
  assert.equal(snapshot.player.gold, 150);
  assert.equal((await auth(request('/api/auth', { action: 'logout' }, accountCookie))).status, 200);
  assert.equal((await getGame(request('/api/game', undefined, accountCookie))).status, 401);
  assert.equal((await auth(request('/api/auth', { action: 'login', email: 'explorador@example.test', password: 'incorrect' }))).status, 401);
  const login = await auth(request('/api/auth', { action: 'login', email: 'EXPLORADOR@example.test', password: 'password12345' }));
  assert.equal(login.status, 200);
  snapshot = await (await getGame(request('/api/game', undefined, cookieFrom(login)))).json() as GameSnapshot;
  assert.equal(snapshot.player.id, id);
  assert.equal(snapshot.character.trainingLevel, 1);
});
test('HTTP handlers reject cross-origin and malformed mutations and claim offline rewards once', async () => {
  assert.equal((await auth(request('/api/auth', { action: 'guest' }, undefined, 'https://evil.example'))).status, 403);
  const malformed = new Request('http://localhost/api/auth', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost' }, body: '{broken' });
  assert.equal((await auth(malformed)).status, 400);
  const guest = await auth(request('/api/auth', { action: 'guest' }));
  const cookie = cookieFrom(guest);
  const snapshot = await (await getGame(request('/api/game', undefined, cookie))).json() as GameSnapshot;
  updateGame(snapshot.player.id, state => { state.lastTick = Date.now() - 90_000; });
  const offline = await (await getGame(request('/api/game', undefined, cookie))).json() as GameSnapshot;
  assert.ok(offline.offline?.gold);
  const claim = await gameAction(request('/api/game/actions', { action: 'claimOffline' }, cookie));
  assert.equal(claim.status, 200);
  assert.equal(((await claim.json()) as GameSnapshot).offline, null);
  assert.equal((await gameAction(request('/api/game/actions', { action: 'claimOffline' }, cookie))).status, 400);
});
