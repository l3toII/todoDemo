import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import ClarifyPage from '../../../pages/ClarifyPage';
import tasksReducer from '../../../features/tasks/tasksSlice';

// Mock the API
vi.mock('../../../services/api', () => ({
  tasksAPI: {
    getByStatus: vi.fn(),
    clarify: vi.fn(),
    complete: vi.fn(),
    delete: vi.fn(),
  },
}));

// Helper to create a test store
const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      tasks: tasksReducer,
    },
    preloadedState,
  });
};

// Helper to render with providers
const renderWithProviders = (ui, { store = createTestStore(), ...renderOptions } = {}) => {
  const Wrapper = ({ children }) => (
    <Provider store={store}>
      <BrowserRouter>{children}</BrowserRouter>
    </Provider>
  );

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};

describe('ClarifyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    const store = createTestStore({
      tasks: {
        inbox: [],
        clarified: [],
        nextActions: [],
        waitingFor: [],
        somedayMaybe: [],
        reference: [],
        currentTask: null,
        loading: true,
        clarifying: false,
        error: null,
        nextCursor: null,
        total: 0,
      },
    });

    renderWithProviders(<ClarifyPage />, { store });

    expect(screen.getByText(/loading your inbox/i)).toBeInTheDocument();
  });

  it('renders empty inbox state when no tasks', async () => {
    const store = createTestStore({
      tasks: {
        inbox: [],
        clarified: [],
        nextActions: [],
        waitingFor: [],
        somedayMaybe: [],
        reference: [],
        currentTask: null,
        loading: false,
        clarifying: false,
        error: null,
        nextCursor: null,
        total: 0,
      },
    });

    renderWithProviders(<ClarifyPage />, { store });

    await waitFor(() => {
      expect(screen.getByText(/inbox zero/i)).toBeInTheDocument();
    });
  });

  it('renders clarify wizard when inbox has tasks', async () => {
    const mockTask = {
      id: '123',
      title: 'Test Task',
      notes: 'Test notes',
      status: 'inbox',
    };

    const store = createTestStore({
      tasks: {
        inbox: [mockTask],
        clarified: [],
        nextActions: [],
        waitingFor: [],
        somedayMaybe: [],
        reference: [],
        currentTask: null,
        loading: false,
        clarifying: false,
        error: null,
        nextCursor: null,
        total: 1,
      },
    });

    renderWithProviders(<ClarifyPage />, { store });

    await waitFor(() => {
      expect(screen.getByText(/clarify & process/i)).toBeInTheDocument();
      expect(screen.getByText(/is this actionable/i)).toBeInTheDocument();
    });
  });

  it('displays error message when there is an error', async () => {
    const store = createTestStore({
      tasks: {
        inbox: [],
        clarified: [],
        nextActions: [],
        waitingFor: [],
        somedayMaybe: [],
        reference: [],
        currentTask: null,
        loading: false,
        clarifying: false,
        error: 'Failed to fetch tasks',
        nextCursor: null,
        total: 0,
      },
    });

    renderWithProviders(<ClarifyPage />, { store });

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch tasks/i)).toBeInTheDocument();
    });
  });

  it('shows progress bar with correct count', async () => {
    const mockTasks = [
      { id: '1', title: 'Task 1', status: 'inbox' },
      { id: '2', title: 'Task 2', status: 'inbox' },
      { id: '3', title: 'Task 3', status: 'inbox' },
    ];

    const store = createTestStore({
      tasks: {
        inbox: mockTasks,
        clarified: [],
        nextActions: [],
        waitingFor: [],
        somedayMaybe: [],
        reference: [],
        currentTask: null,
        loading: false,
        clarifying: false,
        error: null,
        nextCursor: null,
        total: 3,
      },
    });

    renderWithProviders(<ClarifyPage />, { store });

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText(/items remaining/i)).toBeInTheDocument();
      expect(screen.getByText(/task 1 of 3/i)).toBeInTheDocument();
    });
  });

  it('shows GTD tip', async () => {
    const mockTask = {
      id: '123',
      title: 'Test Task',
      status: 'inbox',
    };

    const store = createTestStore({
      tasks: {
        inbox: [mockTask],
        clarified: [],
        nextActions: [],
        waitingFor: [],
        somedayMaybe: [],
        reference: [],
        currentTask: null,
        loading: false,
        clarifying: false,
        error: null,
        nextCursor: null,
        total: 1,
      },
    });

    renderWithProviders(<ClarifyPage />, { store });

    await waitFor(() => {
      expect(screen.getByText(/gtd tip/i)).toBeInTheDocument();
    });
  });

  it('shows up next preview when multiple tasks exist', async () => {
    const mockTasks = [
      { id: '1', title: 'Task 1', status: 'inbox' },
      { id: '2', title: 'Task 2', status: 'inbox' },
      { id: '3', title: 'Task 3', status: 'inbox' },
    ];

    const store = createTestStore({
      tasks: {
        inbox: mockTasks,
        clarified: [],
        nextActions: [],
        waitingFor: [],
        somedayMaybe: [],
        reference: [],
        currentTask: null,
        loading: false,
        clarifying: false,
        error: null,
        nextCursor: null,
        total: 3,
      },
    });

    renderWithProviders(<ClarifyPage />, { store });

    await waitFor(() => {
      expect(screen.getByText(/up next in your inbox/i)).toBeInTheDocument();
    });
  });
});
