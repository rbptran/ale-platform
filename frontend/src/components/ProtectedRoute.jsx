import { Navigate, Outlet } from 'react-router-dom';
import { useIsAuthenticated } from '../store/authStore';

export default function ProtectedRoute() {
  const isAuthenticated = useIsAuthenticated();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
