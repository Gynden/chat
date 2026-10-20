import type { EvolutionPath, GameAction, GameSnapshot, Gear, GearSlot, HistoryEntry } from './types';

export const OFFLINE_CAP_SECONDS = 8 * 60 * 60;
export const OFFLINE_THRESHOLD_SECONDS = 45;
export const EVOLUTION_LEVEL = 5;
export const EVOLUTION_COST = 400;
const HISTORY_LIMIT = 24;
export interface PendingOffline { seconds: number; gold: number; xp: number; gems: number; kills: number; drops: Gear[] }
export interface GameState {
  version: 1;
  gold: number; gems: number; level: number; xp: number; trainingLevel: number;
  evolution: EvolutionPath | null; stage: number; killsInStage: number; totalKills: number;
  enemyHp: number; characterHp: number; inventory: Gear[];
  equipment: Record<GearSlot, string | null>;
  history: HistoryEntry[]; pendingOffline: PendingOffline | null;
  createdAt: number; lastTick: number; eventSequence: number;
}
export interface PlayerInfo { id: string; name: string; isGuest: boolean; createdAt: number }
export class GameError extends Error { constructor(message: string, public status = 400) { super(message); } }

export function xpForLevel(level: number): number { return 26 + level * 10; }
export function trainingCost(state: GameState): number { return Math.floor(70 * Math.pow(1.48, state.trainingLevel)); }
export function statsFor(state: GameState) {
  const gear = Object.values(state.equipment).map(id => state.inventory.find(item => item.id === id));
  const attack = 10 + (state.level - 1) * 3 + state.trainingLevel * 4 + (state.evolution === 'organic' ? 18 : state.evolution === 'metal' ? 10 : 0) + gear.reduce((sum, item) => sum + (item?.attack ?? 0), 0);
  const defense = 3 + (state.level - 1) + state.trainingLevel * 2 + (state.evolution === 'metal' ? 15 : state.evolution === 'organic' ? 5 : 0) + gear.reduce((sum, item) => sum + (item?.defense ?? 0), 0);
  const maxHp = 100 + (state.level - 1) * 14 + state.trainingLevel * 8 + (state.evolution === 'organic' ? 70 : state.evolution === 'metal' ? 100 : 0) + gear.reduce((sum, item) => sum + (item?.health ?? 0), 0);
  return { attack, defense, maxHp, power: attack * 8 + defense * 5 + maxHp };
}
const enemyNames = ['Eco de Ferrugem', 'Olho Errante', 'Larva de Vidro', 'Mandíbula Oca'];
export function enemyFor(stage: number) {
  const isBoss = stage % 5 === 0;
  const region = Math.floor((stage - 1) / 10);
  return {
    name: isBoss ? (region % 2 === 0 ? 'O Sino Faminto' : 'A Raiz do Vazio') : enemyNames[(stage - 1) % enemyNames.length],
    maxHp: Math.floor((28 + stage * 6 + stage * stage * .15) * (isBoss ? 2.8 : 1)),
    attack: Math.floor(5 + stage * 1.5 + (isBoss ? 5 : 0)),
    isBoss,
  };
}
function log(state: GameState, kind: HistoryEntry['kind'], message: string, at: number) {
  state.history.unshift({ id: `event-${++state.eventSequence}`, kind, message, at: new Date(at).toISOString() });
  state.history = state.history.slice(0, HISTORY_LIMIT);
}
const gearTemplates: Omit<Gear, 'id'>[] = [
  { name: 'Presa de Cobre', slot: 'weapon', rarity: 'Comum', attack: 5, defense: 0, health: 0, description: 'Uma engrenagem que aprendeu a morder.' },
  { name: 'Casca da Ruptura', slot: 'armor', rarity: 'Comum', attack: 0, defense: 4, health: 24, description: 'Ainda pulsa com uma memória que não é sua.' },
  { name: 'Núcleo Errante', slot: 'relic', rarity: 'Raro', attack: 4, defense: 2, health: 16, description: 'Um pequeno fragmento de realidade instável.' },
  { name: 'Dente de Frequência', slot: 'weapon', rarity: 'Raro', attack: 11, defense: 1, health: 0, description: 'Corta matéria e o silêncio entre os mundos.' },
  { name: 'Pele de Ferro Vivo', slot: 'armor', rarity: 'Raro', attack: 1, defense: 9, health: 45, description: 'A ferrugem se move para proteger o portador.' },
];
export function createGame(now = Date.now()): GameState {
  return {
    version: 1, gold: 220, gems: 0, level: 1, xp: 0, trainingLevel: 0, evolution: null,
    stage: 1, killsInStage: 0, totalKills: 0, enemyHp: enemyFor(1).maxHp, characterHp: 100,
    inventory: [{ ...gearTemplates[0], id: 'starter-fang' }, { ...gearTemplates[1], id: 'starter-shell' }],
    equipment: { weapon: null, armor: null, relic: null },
    history: [{ id: 'event-1', at: new Date(now).toISOString(), kind: 'milestone', message: 'A Ruptura despertou O Devorador. Sua jornada começa.' }],
    pendingOffline: null, createdAt: now, lastTick: now, eventSequence: 1,
  };
}
function awardXp(state: GameState, xp: number, now: number, silent: boolean) {
  state.xp += xp;
  while (state.xp >= xpForLevel(state.level)) {
    state.xp -= xpForLevel(state.level);
    state.level += 1;
    state.characterHp = Math.min(statsFor(state).maxHp, state.characterHp + 22);
    if (!silent) log(state, 'milestone', `O Devorador alcançou o nível ${state.level}.`, now);
  }
}
function addDrop(state: GameState, now: number, silent: boolean) {
  // Deterministic milestone drops: the browser never decides a roll or item value.
  const index = Math.floor(state.totalKills / 4 - 1) % gearTemplates.length;
  const drop: Gear = { ...gearTemplates[index], id: `drop-${state.totalKills}` };
  // A bounded inventory avoids unbounded storage during extended idle sessions.
  if (state.inventory.length >= 50) {
    state.gold += 15;
    return;
  }
  state.inventory.push(drop);
  if (!silent) log(state, 'loot', `Encontrou ${drop.name}.`, now);
}
function simulate(state: GameState, seconds: number, startTime: number, silent = false) {
  let earnedGold = 0, earnedXp = 0, earnedGems = 0, kills = 0;
  const oldIds = new Set(state.inventory.map(item => item.id));
  for (let second = 1; second <= seconds; second++) {
    const now = startTime + second * 1000;
    const stats = statsFor(state);
    const enemy = enemyFor(state.stage);
    state.enemyHp -= stats.attack;
    if (state.enemyHp <= 0) {
      const gold = 10 + state.stage * 2 + (enemy.isBoss ? 60 : 0);
      const xp = 10 + state.stage * 2 + (enemy.isBoss ? 28 : 0);
      state.gold += gold; earnedGold += gold; earnedXp += xp; kills += 1;
      state.totalKills += 1; state.killsInStage += 1;
      awardXp(state, xp, now, silent);
      if (state.totalKills % 4 === 0) addDrop(state, now, silent);
      if (enemy.isBoss) {
        state.gems += 5; earnedGems += 5;
        if (!silent) log(state, 'milestone', `${enemy.name} foi derrotado. +5 gemas. A Ruptura se abre adiante.`, now);
      }
      if (state.killsInStage >= (enemy.isBoss ? 1 : 3)) {
        state.stage += 1; state.killsInStage = 0;
        if (!silent && state.stage % 5 === 0) log(state, 'milestone', `Fase ${state.stage}: um guardião da Ruptura despertou.`, now);
      }
      state.enemyHp = enemyFor(state.stage).maxHp;
      state.characterHp = Math.min(statsFor(state).maxHp, state.characterHp + Math.ceil(stats.maxHp * .24));
    } else {
      state.characterHp -= Math.max(1, enemy.attack - stats.defense);
      if (state.characterHp <= 0) {
        // No manual attack or death penalty. The creature reforms and farms the previous phase.
        state.stage = Math.max(1, state.stage - 1);
        state.killsInStage = 0;
        state.characterHp = stats.maxHp;
        state.enemyHp = enemyFor(state.stage).maxHp;
      }
    }
  }
  // Salvaged duplicate drops also count as gold, captured by the caller's resource difference.
  return { gold: earnedGold, xp: earnedXp, gems: earnedGems, kills, drops: state.inventory.filter(item => !oldIds.has(item.id)) };
}
export function advanceGame(state: GameState, now = Date.now()): GameState {
  const elapsed = Math.max(0, Math.floor((now - state.lastTick) / 1000));
  if (!elapsed) return state;
  const seconds = Math.min(elapsed, OFFLINE_CAP_SECONDS);
  const isOffline = elapsed > OFFLINE_THRESHOLD_SECONDS;
  const simulation = structuredClone(state);
  // Pending drops already occupy storage, even before collection. Account for them in
  // every simulation so polling/collection cadence cannot change loot or salvage.
  simulation.inventory.push(...(state.pendingOffline?.drops ?? []));
  const result = simulate(simulation, seconds, state.lastTick, isOffline);
  const gold = simulation.gold - state.gold;
  const gems = simulation.gems - state.gems;
  // XP and battle progress always take effect immediately. Pending XP is a receipt,
  // never a second balance; combat cannot run with an obsolete pre-offline level.
  state.level = simulation.level;
  state.xp = simulation.xp;
  state.stage = simulation.stage;
  state.killsInStage = simulation.killsInStage;
  state.totalKills = simulation.totalKills;
  state.enemyHp = simulation.enemyHp;
  state.characterHp = simulation.characterHp;
  if (isOffline) {
    const pending = state.pendingOffline ?? { seconds: 0, gold: 0, xp: 0, gems: 0, kills: 0, drops: [] };
    pending.seconds += seconds; pending.gold += gold; pending.xp += result.xp;
    pending.gems += gems; pending.kills += result.kills;
    pending.drops.push(...result.drops);
    state.pendingOffline = pending;
    state.lastTick = now;
  } else {
    state.gold = simulation.gold;
    state.gems = simulation.gems;
    state.inventory.push(...result.drops);
    state.history = simulation.history;
    state.eventSequence = simulation.eventSequence;
    state.lastTick += elapsed * 1000;
  }
  return state;
}
export function parseAction(value: unknown): GameAction {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new GameError('Ação inválida.');
  const input = value as Record<string, unknown>;
  if (input.action === 'train' || input.action === 'claimOffline') {
    if (Object.keys(input).some(key => key !== 'action')) throw new GameError('Esta ação não aceita valores de recursos.');
    return { action: input.action };
  }
  if (input.action === 'equip' && typeof input.itemId === 'string' && input.itemId.length <= 100 && Object.keys(input).every(key => ['action', 'itemId'].includes(key))) return { action: 'equip', itemId: input.itemId };
  if (input.action === 'evolve' && (input.path === 'organic' || input.path === 'metal') && Object.keys(input).every(key => ['action', 'path'].includes(key))) return { action: 'evolve', path: input.path };
  throw new GameError('Ação inválida.');
}
export function applyAction(state: GameState, action: GameAction, now = Date.now()): GameState {
  if (action.action === 'train') {
    const cost = trainingCost(state);
    if (!Number.isSafeInteger(cost) || state.trainingLevel >= 50) throw new GameError('Treinamento máximo alcançado.');
    if (state.gold < cost) throw new GameError('Gold insuficiente para treinar.');
    state.gold -= cost; state.trainingLevel += 1;
    state.characterHp = statsFor(state).maxHp;
    log(state, 'training', `Instinto aprimorado para ${state.trainingLevel}. +4 ATQ, +2 DEF.`, now);
  } else if (action.action === 'equip') {
    const item = state.inventory.find(gear => gear.id === action.itemId);
    if (!item) throw new GameError('Este equipamento não pertence à sua conta.');
    if (state.equipment[item.slot] === item.id) throw new GameError('Este item já está equipado.');
    const oldMaxHp = statsFor(state).maxHp;
    state.equipment[item.slot] = item.id;
    // Gear changes preserve health percentage; swapping armor cannot create healing.
    state.characterHp = Math.max(1, Math.floor(state.characterHp * statsFor(state).maxHp / oldMaxHp));
    log(state, 'loot', `${item.name} equipado em O Devorador.`, now);
  } else if (action.action === 'evolve') {
    if (state.evolution) throw new GameError('A evolução já foi escolhida e é permanente.');
    if (state.level < EVOLUTION_LEVEL) throw new GameError(`A evolução desperta no nível ${EVOLUTION_LEVEL}.`);
    if (state.gold < EVOLUTION_COST) throw new GameError('Gold insuficiente para evoluir.');
    state.gold -= EVOLUTION_COST; state.evolution = action.path;
    state.characterHp = statsFor(state).maxHp;
    log(state, 'evolution', action.path === 'organic' ? 'Consumiu matéria viva e tornou-se Predador de raízes. Evolução permanente.' : 'Consumiu metal e tornou-se Máquina profana. Evolução permanente.', now);
  } else if (action.action === 'claimOffline') {
    if (!state.pendingOffline) throw new GameError('Nenhuma recompensa offline para coletar.');
    const pending = state.pendingOffline;
    state.gold += pending.gold; state.gems += pending.gems;
    // XP/levels were applied during automatic simulation; collection cannot duplicate XP.
    const existing = new Set(state.inventory.map(item => item.id));
    state.inventory.push(...pending.drops.filter(item => !existing.has(item.id)).slice(0, Math.max(0, 50 - state.inventory.length)));
    log(state, 'offline', `Recompensas coletadas: ${pending.gold} gold. ${pending.xp} XP já incorporada e ${pending.kills} inimigos derrotados.`, now);
    state.pendingOffline = null;
  }
  return state;
}
export function toSnapshot(state: GameState, player: PlayerInfo, now = Date.now()): GameSnapshot {
  const stats = statsFor(state);
  const enemy = enemyFor(state.stage);
  const secondsPerEnemy = Math.ceil(enemy.maxHp / stats.attack);
  const equipment = Object.fromEntries(Object.entries(state.equipment).map(([slot, id]) => [slot, state.inventory.find(item => item.id === id) ?? null])) as GameSnapshot['character']['equipment'];
  return {
    serverTime: new Date(now).toISOString(),
    player: { ...player, gold: state.gold, gems: state.gems, createdAt: new Date(player.createdAt).toISOString() },
    character: {
      id: 'devourer', name: 'O Devorador', title: state.evolution === 'organic' ? 'Predador de raízes' : state.evolution === 'metal' ? 'Máquina profana' : 'Uma fome sem nome',
      nature: state.evolution === 'metal' ? 'Construto' : 'Predador', rarity: 'Comum', level: state.level,
      xp: state.xp, xpToNext: xpForLevel(state.level), trainingLevel: state.trainingLevel,
      evolution: state.evolution, ageSeconds: Math.max(0, Math.floor((now - state.createdAt) / 1000)), stats, equipment,
    },
    area: { name: 'Floresta dos Ecos', subtitle: 'Onde a realidade começou a se desfazer', stage: state.stage, region: Math.floor((state.stage - 1) / 10) + 1, totalKills: state.totalKills, nextBossStage: Math.ceil(state.stage / 5) * 5 },
    combat: { enemy: { ...enemy, hp: Math.max(0, state.enemyHp) }, characterHp: Math.max(0, state.characterHp), progress: Math.min(1, Math.max(0, 1 - state.enemyHp / enemy.maxHp)), state: enemy.isBoss ? 'boss' : 'fighting', killsInStage: state.killsInStage, killsRequired: enemy.isBoss ? 1 : 3 },
    inventory: state.inventory,
    history: state.history,
    offline: state.pendingOffline ? { seconds: state.pendingOffline.seconds, gold: state.pendingOffline.gold, xp: state.pendingOffline.xp, gems: state.pendingOffline.gems, items: state.pendingOffline.drops.length, kills: state.pendingOffline.kills, maxHours: 8, xpApplied: true } : null,
    rates: { goldPerMinute: Math.round((10 + state.stage * 2 + (enemy.isBoss ? 60 : 0)) * 60 / secondsPerEnemy), xpPerMinute: Math.round((10 + state.stage * 2 + (enemy.isBoss ? 28 : 0)) * 60 / secondsPerEnemy), secondsPerEnemy },
    costs: { training: trainingCost(state), evolution: EVOLUTION_COST, evolutionLevel: EVOLUTION_LEVEL },
  };
}
