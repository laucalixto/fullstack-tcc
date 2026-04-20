import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { socket } from '../ws/socket';
import { EVENTS } from '@safety-board/shared';
import type { RoomJoinedPayload, RoomErrorPayload } from '@safety-board/shared';
import { useGameStore } from '../stores/gameStore';

const ERROR_MESSAGES: Record<RoomErrorPayload['code'], string> = {
  ROOM_FULL:            'Sala cheia.',
  ROOM_NOT_FOUND:       'PIN inválido ou sessão encerrada.',
  GAME_ALREADY_STARTED: 'Partida já iniciada.',
  NOT_YOUR_TURN:        'Não é o seu turno.',
};

export function PinJoinPage() {
  const { pin } = useParams<{ pin: string }>();
  const navigate      = useNavigate();
  const setMyPlayerId = useGameStore((s) => s.setMyPlayerId);
  const setSession    = useGameStore((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pin) { navigate('/'); return; }

    socket.emit(EVENTS.ROOM_JOIN, { pin, playerName: 'Jogador' });

    socket.once(EVENTS.ROOM_JOINED, ({ playerId }: RoomJoinedPayload) => {
      setMyPlayerId(playerId);
    });

    socket.once(EVENTS.GAME_STATE, (session) => {
      setSession(session);
      navigate('/personagem');
    });

    socket.once(EVENTS.ROOM_ERROR, (payload: RoomErrorPayload) => {
      setError(ERROR_MESSAGES[payload.code] ?? 'Erro ao entrar na sala.');
    });
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
