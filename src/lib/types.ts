export type EvolutionPath = 'organic' | 'metal';
export type GearSlot = 'weapon' | 'armor' | 'relic';
export interface Gear {
  id: string;
  name: string;
  slot: GearSlot;
  rarity: 'Comum' | 'Raro';
  attack: number;
  defense: number;
  health: number;
  description: string;
}
export interface HistoryEntry {
  id: string;
  at: string;
  kind: 'milestone' | 'loot' | 'evolution' | 'training' | 'offline';
  message: string;
}
export interface GameSnapshot {
  serverTime: string;
  player: { id: string; name: string; isGuest: boolean; gold: number; gems: number; createdAt: string };
  character: {
    id: string; name: string; title: string; nature: string; rarity: 'Comum';
    level: number; xp: number; xpToNext: number; trainingLevel: number;
    evolution: EvolutionPath | null; ageSeconds: number;
    stats: { attack: number; defense: number; maxHp: number; power: number };
    equipment: Record<GearSlot, Gear | null>;
  };
  area: { name: string; subtitle: string; stage: number; region: number; totalKills: number; nextBossStage: number };
  combat: {
    enemy: { name: string; hp: number; maxHp: number; attack: number; isBoss: boolean };
    characterHp: number; progress: number; state: 'fighting' | 'boss';
    killsInStage: number; killsRequired: number;
  };
  inventory: Gear[];
  history: HistoryEntry[];
  offline: { seconds: number; gold: number; xp: number; gems: number; items: number; kills: number; maxHours: number; xpApplied: true } | null;
  rates: { goldPerMinute: number; xpPerMinute: number; secondsPerEnemy: number };
  costs: { training: number; evolution: number; evolutionLevel: number };
}
export type GameAction =
  | { action: 'train' }
  | { action: 'equip'; itemId: string }
  | { action: 'evolve'; path: EvolutionPath }
  | { action: 'claimOffline' };
export interface ApiError { error: string }
