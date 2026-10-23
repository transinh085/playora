'use client';

import type { CommandAck, HostCommand } from '@playora/contracts';
import { useLiveRoom } from '@playora/realtime-client/react';
import { Button } from '@playora/ui/components/button';
import { useState } from 'react';
import { REALTIME_URL, SPIKE_EVENT } from '@/lib/live';
import type { ScreenView } from '../types';

/** Mobile-first host console for the spike (LIV-01 preview). */
export default function SpikeHostPage() {
  const [hostKey, setHostKey] = useState('');
  const [submittedKey, setSubmittedKey] = useState<string | null>(null);
  const [lastAck, setLastAck] = useState<string>('');
  const { connected, view, socket } = useLiveRoom<ScreenView>(
    submittedKey
      ? { url: REALTIME_URL, eventId: SPIKE_EVENT, role: 'host', auth: { hostKey: submittedKey } }
      : null,
  );

  async function send(command: HostCommand) {
    const ack: CommandAck | undefined = await socket.current?.emitWithAck('host.command', command);
    setLastAck(`${command.cmd}: ${ack?.ok ? 'OK' : (ack?.error ?? 'không có phản hồi')}`);
  }

  if (!submittedKey) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
        <h1 className="text-2xl font-extrabold">MC điều khiển</h1>
        <input
          className="h-12 rounded-lg border border-input bg-background px-3"
          placeholder="Host key (REALTIME_HOST_KEY)"
          value={hostKey}
          onChange={(e) => setHostKey(e.target.value)}
        />
        <Button className="h-12" onClick={() => setSubmittedKey(hostKey)}>
          Kết nối
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-6">
      <p className="text-sm opacity-60">
        {connected ? 'Đã kết nối' : 'Chưa kết nối (sai key?)'} · {view?.online ?? 0} người ·{' '}
        {view?.status ?? '-'}
      </p>
      <Button className="h-16 text-lg" onClick={() => send({ cmd: 'round.start' })}>
        Bắt đầu (60s)
      </Button>
      <Button
        className="h-16 text-lg"
        variant="secondary"
        onClick={() => send({ cmd: 'round.end' })}
      >
        Kết thúc ngay
      </Button>
      <Button
        className="h-16 text-lg"
        variant="secondary"
        onClick={() => send({ cmd: 'round.next' })}
      >
        Ván mới
      </Button>
      <p className="text-sm opacity-60">{lastAck}</p>
      <ol className="text-sm">
        {view?.top.slice(0, 5).map((r, i) => (
          <li key={r.id}>
            #{i + 1} {r.name} ({r.team}) — {r.score}
          </li>
        ))}
      </ol>
    </main>
  );
}
