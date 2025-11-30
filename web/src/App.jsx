import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import PasswordResetRequestPage from './pages/PasswordResetRequestPage';
import PasswordResetConfirmPage from './pages/PasswordResetConfirmPage';
import InboxPage from './pages/InboxPage';
import ProtectedRoute from './components/ProtectedRoute';
import Navigation from './components/Navigation';

// Layout component for authenticated pages
const AuthenticatedLayout = ({ children }) => (
  <div className="min-h-screen bg-gray-50">
    <Navigation />
    <main>{children}</main>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/password-reset" element={<PasswordResetRequestPage />} />
        <Route path="/password-reset/confirm" element={<PasswordResetConfirmPage />} />

        {/* Protected routes */}
        <Route
          path="/inbox"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <InboxPage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/inbox" replace />} />

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/inbox" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
