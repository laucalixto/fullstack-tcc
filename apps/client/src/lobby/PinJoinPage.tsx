import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { socket } from '../ws/socket';
import { EVENTS } from '@safety-board/shared';
import type { GameSession, RoomJoinedPayload, RoomErrorPayload } from '@safety-board/shared';
import { useGameStore } from '../stores/gameStore';

const ERROR_MESSAGES: Record<RoomErrorPayload['code'], string> = {
  ROOM_FULL:            'Sala cheia.',
  ROOM_NOT_FOUND:       'PIN inválido ou sessão encerrada.',
  GAME_ALREADY_STARTED: 'Partida em andamento.',
  NOT_YOUR_TURN:        'Não é o seu turno.',
};

export function PinJoinPage() {
  const { pin } = useParams<{ pin: string }>();
  const navigate      = useNavigate();
  const setMyPlayerId = useGameStore((s) => s.setMyPlayerId);
  const setSession    = useGameStore((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);
  const hasJoined = useRef(false);

  useEffect(() => {
    if (!pin) { navigate('/'); return; }

    // Emite apenas uma vez — guard evita duplo emit no StrictMode
    if (!hasJoined.current) {
      hasJoined.current = true;
      socket.emit(EVENTS.ROOM_JOIN, { pin, playerName: 'Jogador' });
    }

    // Listeners re-registrados a cada montagem para garantir que a resposta
    // do servidor seja capturada mesmo após o ciclo unmount/remount do StrictMode
    let active = true;

    function onJoined({ playerId }: RoomJoinedPayload) {
      if (active) setMyPlayerId(playerId);
    }
    function onState(session: GameSession) {
      if (active) { setSession(session); navigate('/personagem'); }
    }
    function onError(payload: RoomErrorPayload) {
      if (active) setError(ERROR_MESSAGES[payload.code] ?? 'Erro ao entrar na sala.');
    }

    socket.once(EVENTS.ROOM_JOINED, onJoined);
    socket.once(EVENTS.GAME_STATE, onState);
    socket.once(EVENTS.ROOM_ERROR, onError);

    return () => {
      active = false;
      socket.off(EVENTS.ROOM_JOINED, onJoined);
      socket.off(EVENTS.GAME_STATE, onState);
      socket.off(EVENTS.ROOM_ERROR, onError);
    };
  }, [pin, navigate, setMyPlayerId, setSession]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center space-y-4 p-8">
          <p className="font-bold text-lg">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary text-white rounded-xl font-bold"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <p className="font-bold animate-pulse">Entrando na sessão...</p>
    </div>
  );
}
