import { Navigate } from 'react-router-dom';
import { useManagerStore } from '../stores/managerStore';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useManagerStore((s) => s.token);
  if (!token) return <Navigate to="/manager" replace />;
  return <>{children}</>;
}
