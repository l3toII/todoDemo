import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import PasswordResetRequestPage from './pages/PasswordResetRequestPage';
import PasswordResetConfirmPage from './pages/PasswordResetConfirmPage';
import InboxPage from './pages/InboxPage';
import ClarifyPage from './pages/ClarifyPage';
import ContextsPage from './pages/ContextsPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import NextActionsPage from './pages/NextActionsPage';
import WaitingForPage from './pages/WaitingForPage';
import SomedayMaybePage from './pages/SomedayMaybePage';
import ReferencePage from './pages/ReferencePage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import AccountDeletionPage from './pages/AccountDeletionPage';
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
        <Route
          path="/clarify"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <ClarifyPage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/contexts"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <ContextsPage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <ProjectsPage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <ProjectDetailPage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/next-actions"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <NextActionsPage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/waiting-for"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <WaitingForPage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/someday-maybe"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <SomedayMaybePage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reference"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <ReferencePage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/account/settings"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <AccountSettingsPage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/account/delete"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <AccountDeletionPage />
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
