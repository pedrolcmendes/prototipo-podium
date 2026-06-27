import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/" replace />;
  if (adminOnly && !user.admin) return <Navigate to="/painel" replace />;

  return children;
}
