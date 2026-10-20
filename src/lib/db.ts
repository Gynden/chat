import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createGame, type GameState } from './game';

export interface UserRow { id: string; name: string; email: string | null; password_hash: string | null; is_guest: number; created_at: number }
let cached: DatabaseSync | undefined;
export function getDatabase(): DatabaseSync {
  if (cached) return cached;
  const directory = process.env.GAME_DATA_DIR ? resolve(process.env.GAME_DATA_DIR) : join(process.cwd(), '.data');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  cached = new DatabaseSync(join(directory, 'ruptura.sqlite'));
  cached.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA foreign_keys=ON;
    PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE,
      password_hash TEXT, is_guest INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS games (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, state TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS session_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS auth_limits (
      key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, attempts INTEGER NOT NULL
    );
  `);
  return cached;
}
export function transaction<T>(operation: (database: DatabaseSync) => T): T {
  const database = getDatabase();
  database.exec('BEGIN IMMEDIATE');
  try {
    const result = operation(database);
    database.exec('COMMIT');
    return result;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
export function findUser(id: string): UserRow | undefined {
  return getDatabase().prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown as UserRow | undefined;
}
export function findUserByEmail(email: string): UserRow | undefined {
  return getDatabase().prepare('SELECT * FROM users WHERE email = ?').get(email) as unknown as UserRow | undefined;
}
export function createUser(name: string, email: string | null = null, passwordHash: string | null = null, now = Date.now()): UserRow {
  const user: UserRow = { id: randomUUID(), name, email, password_hash: passwordHash, is_guest: email ? 0 : 1, created_at: now };
  transaction(database => {
    database.prepare('INSERT INTO users (id,name,email,password_hash,is_guest,created_at) VALUES (?,?,?,?,?,?)').run(user.id, user.name, user.email, user.password_hash, user.is_guest, user.created_at);
    database.prepare('INSERT INTO games (user_id,state) VALUES (?,?)').run(user.id, JSON.stringify(createGame(now)));
  });
  return user;
}
export function upgradeGuest(id: string, name: string, email: string, passwordHash: string): UserRow {
  const result = getDatabase().prepare('UPDATE users SET name=?,email=?,password_hash=?,is_guest=0 WHERE id=? AND is_guest=1').run(name, email, passwordHash, id);
  if (result.changes !== 1) throw new Error('Conta visitante não encontrada.');
  return findUser(id)!;
}
export function updateGame<T>(userId: string, operation: (state: GameState) => T): T {
  return transaction(database => {
    const row = database.prepare('SELECT state FROM games WHERE user_id = ?').get(userId) as { state: string } | undefined;
    if (!row) throw new Error('Jornada não encontrada.');
    const state = JSON.parse(row.state) as GameState;
    const result = operation(state);
    database.prepare('UPDATE games SET state=? WHERE user_id=?').run(JSON.stringify(state), userId);
    return result;
  });
}
export function consumeAuthLimit(key: string, max: number, now = Date.now(), windowMs = 15 * 60 * 1000): boolean {
  return transaction(database => {
    database.prepare('DELETE FROM auth_limits WHERE window_start < ?').run(now - 24 * 60 * 60 * 1000);
    const row = database.prepare('SELECT * FROM auth_limits WHERE key=?').get(key) as { window_start: number; attempts: number } | undefined;
    if (!row || now - row.window_start >= windowMs) {
      database.prepare('INSERT INTO auth_limits (key,window_start,attempts) VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET window_start=excluded.window_start,attempts=1').run(key, now);
      return true;
    }
    if (row.attempts >= max) return false;
    database.prepare('UPDATE auth_limits SET attempts=attempts+1 WHERE key=?').run(key);
    return true;
  });
}
