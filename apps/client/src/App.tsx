import { useEffect, useState } from 'react';
import { socket } from './ws/socket';

type WsStatus = 'connecting...' | 'connected' | 'disconnected';

export default function App() {
  const [wsStatus, setWsStatus] = useState<WsStatus>(
    socket.connected ? 'connected' : 'connecting...',
  );

  useEffect(() => {
    function onConnect() {
      setWsStatus('connected');
    }
    function onDisconnect() {
      setWsStatus('disconnected');
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="font-headline text-4xl font-bold text-primary uppercase tracking-widest">
        Safety Board
      </h1>

      <p className="font-body text-on-surface-variant text-sm">
        Operação Conformidade 3D — Walking Skeleton
      </p>

      <div className="rounded-lg border border-outline-variant bg-surface-container px-6 py-4 text-center">
        <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
          WebSocket
        </span>
        <p
          data-testid="ws-status"
          className={`mt-1 text-lg font-semibold ${
            wsStatus === 'connected'
              ? 'text-secondary'
              : wsStatus === 'disconnected'
                ? 'text-tertiary'
                : 'text-on-surface-variant'
          }`}
        >
          {wsStatus}
        </p>
      </div>
    </main>
  );
}
