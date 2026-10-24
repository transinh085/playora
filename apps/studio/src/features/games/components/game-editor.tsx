'use client';

import { hasNonHotEditableChanges, resolvePlayOrigin } from '../lib/builder-helpers';
import { EditorShell } from './editor-shell';

export { EditorShell, hasNonHotEditableChanges, resolvePlayOrigin };

export function GameEditor({
  orgId,
  eventId,
  gameId,
}: {
  orgId: string;
  eventId?: string;
  gameId: string;
}) {
  return <EditorShell orgId={orgId} eventId={eventId} gameId={gameId} />;
}
