import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceGame, applyAction, createGame, EVOLUTION_COST, OFFLINE_CAP_SECONDS, parseAction, statsFor, toSnapshot } from '../src/lib/game';

const EPOCH = 1_770_000_000_000;
test('idle combat advances automatically with server time and awards XP/gold', () => {
  const state = createGame(EPOCH);
  advanceGame(state, EPOCH + 40_000);
  assert.ok(state.totalKills > 3);
  assert.ok(state.level > 1);
  assert.ok(state.gold > 220);
  assert.ok(state.stage > 1);
  assert.equal(state.pendingOffline, null);
});
test('poll cadence produces the same deterministic combat result', () => {
  const once = createGame(EPOCH);
  const polled = createGame(EPOCH);
  advanceGame(once, EPOCH + 40_000);
  for (let second = 1; second <= 40; second++) advanceGame(polled, EPOCH + second * 1000);
  assert.deepEqual(polled, once);
});
test('offline rewards cap at eight hours, remain pending, and can only be claimed once', () => {
  const day = createGame(EPOCH);
  const cap = createGame(EPOCH);
  advanceGame(day, EPOCH + 24 * 60 * 60 * 1000);
  advanceGame(cap, EPOCH + OFFLINE_CAP_SECONDS * 1000);
  assert.deepEqual(day.pendingOffline, cap.pendingOffline);
  assert.equal(day.pendingOffline!.seconds, OFFLINE_CAP_SECONDS);
  assert.equal(day.gold, 220);
  const gold = day.pendingOffline!.gold;
  const xp = day.pendingOffline!.xp;
  assert.ok(gold > 0 && xp > 0);
  applyAction(day, { action: 'claimOffline' }, EPOCH + 86_400_000);
  assert.equal(day.gold, 220 + gold);
  assert.ok(day.level > 1);
  assert.equal(day.pendingOffline, null);
  assert.throws(() => applyAction(day, { action: 'claimOffline' }), /Nenhuma recompensa/);
});
test('training spends server-calculated cost; equipment must be owned', () => {
  const state = createGame(EPOCH);
  const base = statsFor(state);
  applyAction(state, { action: 'train' }, EPOCH);
  assert.equal(state.gold, 150);
  assert.equal(statsFor(state).attack, base.attack + 4);
  applyAction(state, { action: 'equip', itemId: 'starter-fang' }, EPOCH);
  assert.equal(statsFor(state).attack, base.attack + 9);
  assert.throws(() => applyAction(state, { action: 'equip', itemId: 'forged-id' }), /não pertence/);
  assert.throws(() => applyAction(state, { action: 'equip', itemId: 'starter-fang' }), /já está equipado/);
  state.gold = 0;
  assert.throws(() => applyAction(state, { action: 'train' }), /insuficiente/);
});
test('evolution is gated by level/gold and remains a permanent choice', () => {
  const state = createGame(EPOCH);
  assert.throws(() => applyAction(state, { action: 'evolve', path: 'organic' }), /nível/);
  state.level = 5;
  assert.throws(() => applyAction(state, { action: 'evolve', path: 'organic' }), /insuficiente/);
  state.gold = EVOLUTION_COST;
  applyAction(state, { action: 'evolve', path: 'metal' }, EPOCH);
  assert.equal(state.gold, 0);
  assert.equal(state.evolution, 'metal');
  assert.throws(() => applyAction(state, { action: 'evolve', path: 'organic' }), /permanente/);
});
test('action validator rejects client resource mutations and invalid evolution values', () => {
  for (const input of [null, [], { action: 'attack' }, { action: 'train', gold: 999999 }, { action: 'evolve', path: 'legendary' }, { action: 'equip', itemId: 1 }, { action: 'claimOffline', xp: 900 }]) assert.throws(() => parseAction(input));
  assert.deepEqual(parseAction({ action: 'train' }), { action: 'train' });
});
test('clock rollback cannot grant rewards and snapshot exposes no persistence fields', () => {
  const state = createGame(EPOCH);
  advanceGame(state, EPOCH - 10_000);
  assert.equal(state.gold, 220);
  assert.equal(state.lastTick, EPOCH);
  const snapshot = toSnapshot(state, { id: 'x', name: 'Viajante', isGuest: true, createdAt: EPOCH }, EPOCH);
  assert.equal(snapshot.character.rarity, 'Comum');
  assert.equal(snapshot.character.id, 'devourer');
  assert.equal('lastTick' in snapshot, false);
});

test('unclaimed offline progress carries XP, combat and reserved drops across absences', () => {
  const once = createGame(EPOCH);
  const split = createGame(EPOCH);
  advanceGame(once, EPOCH + 2 * 60 * 60 * 1000);
  advanceGame(split, EPOCH + 60 * 60 * 1000);
  advanceGame(split, EPOCH + 2 * 60 * 60 * 1000);
  assert.deepEqual(split, once);
  const levelBeforeClaim = split.level;
  const xpBeforeClaim = split.xp;
  applyAction(split, { action: 'claimOffline' }, EPOCH + 2 * 60 * 60 * 1000);
  assert.equal(split.level, levelBeforeClaim);
  assert.equal(split.xp, xpBeforeClaim);
  assert.equal(split.inventory.length, 50);
});
test('switching equivalent armor cannot heal the character', () => {
  const state = createGame(EPOCH);
  const shell = state.inventory.find(item => item.id === 'starter-shell')!;
  state.inventory.push({ ...shell, id: 'duplicate-shell' });
  applyAction(state, { action: 'equip', itemId: 'starter-shell' }, EPOCH);
  state.characterHp = 25;
  applyAction(state, { action: 'equip', itemId: 'duplicate-shell' }, EPOCH);
  assert.equal(state.characterHp, 25);
  applyAction(state, { action: 'equip', itemId: 'starter-shell' }, EPOCH);
  assert.equal(state.characterHp, 25);
});
