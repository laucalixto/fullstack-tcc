import { useEffect, useState } from 'react';
import { socket } from './ws/socket';
import { ThreeCanvas } from './three/ThreeCanvas';

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
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* Cena 3D — ocupa toda a tela */}
      <ThreeCanvas />

      {/* HUD — WebSocket status sobreposto */}
      <div
        style={{ position: 'absolute', top: 16, right: 16 }}
        className="rounded-lg border border-outline-variant bg-surface-container/80 px-4 py-2 text-center backdrop-blur-sm"
      >
        <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
          WS
        </span>
        <p
          data-testid="ws-status"
          className={`text-sm font-semibold ${
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
    </div>
  );
}
