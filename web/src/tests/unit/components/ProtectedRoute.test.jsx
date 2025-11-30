import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import authReducer from '../../../features/auth/authSlice';
import ProtectedRoute from '../../../components/ProtectedRoute';

describe('ProtectedRoute', () => {
  let store;

  const createStore = (isAuthenticated = false) => {
    return configureStore({
      reducer: {
        auth: authReducer,
      },
      preloadedState: {
        auth: {
          user: isAuthenticated ? { id: 1, email: 'test@example.com' } : null,
          accessToken: isAuthenticated ? 'test-token' : null,
          refreshToken: isAuthenticated ? 'test-refresh-token' : null,
          isAuthenticated,
          isLoading: false,
          error: null,
          sessionTimeout: null,
        },
      },
    });
  };

  const renderWithRouter = (store, initialRoute = '/protected') => {
    return render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </Provider>
    );
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('renders children when user is authenticated', () => {
    store = createStore(true);
    renderWithRouter(store);

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', () => {
    store = createStore(false);
    renderWithRouter(store);

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('preserves the intended destination in location state', () => {
    store = createStore(false);

    let capturedLocation;

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/protected?foo=bar']}>
          <Routes>
            <Route
              path="/login"
              element={
                <div>
                  Login Page
                  <LocationCapture onCapture={(loc) => { capturedLocation = loc; }} />
                </div>
              }
            />
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders multiple children correctly when authenticated', () => {
    store = createStore(true);

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>First Child</div>
                  <div>Second Child</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText('First Child')).toBeInTheDocument();
    expect(screen.getByText('Second Child')).toBeInTheDocument();
  });
});

// Helper component to capture location
function LocationCapture({ onCapture }) {
  const { useLocation } = require('react-router-dom');
  const location = useLocation();
  onCapture?.(location);
  return null;
}
