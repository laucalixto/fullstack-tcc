import { Navigate } from 'react-router-dom';
import { usePlayerStore } from '../stores/playerStore';

export function PlayerGuard({ children }: { children: React.ReactNode }) {
  const token = usePlayerStore((s) => s.token);
  if (!token) return <Navigate to="/jogador" replace />;
  return <>{children}</>;
}
