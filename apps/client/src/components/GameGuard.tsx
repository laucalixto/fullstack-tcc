import { Navigate } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';

export function GameGuard({ children }: { children: React.ReactNode }) {
  const session = useGameStore((s) => s.session);
  if (!session) return <Navigate to="/" replace />;
  return <>{children}</>;
}
