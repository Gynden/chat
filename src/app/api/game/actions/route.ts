import { requireUser } from '@/lib/auth';
import { updateGame } from '@/lib/db';
import { advanceGame, applyAction, parseAction, toSnapshot } from '@/lib/game';
import { assertSameOrigin, errorResponse, json, readJson } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = requireUser(request);
    const action = parseAction(await readJson(request));
    const now = Date.now();
    const snapshot = updateGame(user.id, state => {
      advanceGame(state, now);
      applyAction(state, action, now);
      return toSnapshot(state, { id: user.id, name: user.name, isGuest: Boolean(user.is_guest), createdAt: user.created_at }, now);
    });
    return json(snapshot);
  } catch (error) { return errorResponse(error); }
}
