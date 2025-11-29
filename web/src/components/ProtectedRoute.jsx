import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '../features/auth/authSlice';

/**
 * ProtectedRoute component
 *
 * Wraps routes that require authentication.
 * Redirects to login page if user is not authenticated.
 * Preserves the intended destination in location state.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The protected component(s) to render
 * @returns {React.ReactNode}
 */
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login page, but save the attempted location
    // so we can redirect back after successful login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
