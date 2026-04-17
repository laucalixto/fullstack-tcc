import { useEffect, useState } from 'react';
import { socket } from './ws/socket';
import { AppRouter } from './AppRouter';

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
    <>
      {/* WS status indicator — overlay em todas as telas */}
      <div
        style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999 }}
        className="rounded-lg border border-outline-variant bg-surface-container/80 px-3 py-1.5 text-center backdrop-blur-sm"
      >
        <p
          data-testid="ws-status"
          className={`text-xs font-semibold ${
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

      <AppRouter />
    </>
  );
}
