import Dexie, { type EntityTable } from 'dexie';
import type { ResuscitationSession } from '../engine/types';

interface StoredSession {
  id: string;
  session: ResuscitationSession;
  createdAt: number;
  updatedAt: number;
  completed: boolean;
}

const db = new Dexie('ACLSTimerDB') as Dexie & {
  sessions: EntityTable<StoredSession, 'id'>;
};

db.version(1).stores({
  sessions: 'id, createdAt, updatedAt, completed',
});

export async function saveSession(session: ResuscitationSession): Promise<void> {
  const now = Date.now();
  const completed = session.phase === 'rosc' || session.phase === 'terminated' || session.phase === 'post_resuscitation';

  await db.sessions.put({
    id: session.id,
    session,
    createdAt: session.startTime,
    updatedAt: now,
    completed,
  });
}

export async function getActiveSession(): Promise<ResuscitationSession | null> {
  const active = await db.sessions
    .where('completed')
    .equals(0) // false stored as 0
    .first();

  return active?.session ?? null;
}

export async function getSessionHistory(): Promise<ResuscitationSession[]> {
  const sessions = await db.sessions
    .orderBy('createdAt')
    .reverse()
    .limit(50)
    .toArray();

  return sessions.map((s) => s.session);
}

export async function getSession(id: string): Promise<ResuscitationSession | null> {
  const stored = await db.sessions.get(id);
  return stored?.session ?? null;
}

export async function deleteSession(id: string): Promise<void> {
  await db.sessions.delete(id);
}

export { db };
