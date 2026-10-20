import { requireUser } from '@/lib/auth';
import { updateGame } from '@/lib/db';
import { advanceGame, toSnapshot } from '@/lib/game';
import { errorResponse, json } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const user = requireUser(request);
    const now = Date.now();
    const snapshot = updateGame(user.id, state => {
      advanceGame(state, now);
      return toSnapshot(state, { id: user.id, name: user.name, isGuest: Boolean(user.is_guest), createdAt: user.created_at }, now);
    });
    return json(snapshot);
  } catch (error) { return errorResponse(error); }
}
