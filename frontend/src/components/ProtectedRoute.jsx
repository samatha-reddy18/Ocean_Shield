import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';

// Guards routes by authentication and (optionally) role.
export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullPage label="Verifying session..." />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="container" style={{ marginTop: '3rem' }}>
        <div className="alert alert-error">
          Access denied. You need {roles.join(' or ')} privileges to view this page.
        </div>
      </div>
    );
  }

  return children;
}
