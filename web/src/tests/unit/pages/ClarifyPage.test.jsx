import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import ClarifyPage from '../../../pages/ClarifyPage';
import tasksReducer from '../../../features/tasks/tasksSlice';
import { tasksAPI } from '../../../services/api';

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
    // Mock API to return empty inbox
    tasksAPI.getByStatus.mockResolvedValue({ data: { data: [], total: 0 } });

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

    // Mock API to return the same task
    tasksAPI.getByStatus.mockResolvedValue({ data: { data: [mockTask], total: 1 } });

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
      // Use heading role to avoid matching the GTD tip text
      expect(screen.getByRole('heading', { name: /is this actionable/i })).toBeInTheDocument();
    });
  });

  it('displays error message when there is an error', async () => {
    // Mock API to reject with error
    tasksAPI.getByStatus.mockRejectedValue(new Error('Failed to fetch tasks'));

    const store = createTestStore({
      tasks: {
        inbox: [{ id: '1', title: 'Task', status: 'inbox' }],
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
      expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
    });
  });

  it('shows progress bar with correct count', async () => {
    const mockTasks = [
      { id: '1', title: 'Task 1', status: 'inbox' },
      { id: '2', title: 'Task 2', status: 'inbox' },
      { id: '3', title: 'Task 3', status: 'inbox' },
    ];

    // Mock API to return the same tasks
    tasksAPI.getByStatus.mockResolvedValue({ data: { data: mockTasks, total: 3 } });

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
      // The count is displayed in a specific div with text-3xl class
      expect(screen.getByText(/items remaining/i)).toBeInTheDocument();
      expect(screen.getByText(/task 1 of 3/i)).toBeInTheDocument();
    });

    // Check the inbox count is 3 (displayed in the large blue number)
    // Use getAllByText since '3' appears multiple times (count + task number in "Up next")
    const countElements = screen.getAllByText('3');
    expect(countElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows GTD tip', async () => {
    const mockTask = {
      id: '123',
      title: 'Test Task',
      status: 'inbox',
    };

    // Mock API to return the same task
    tasksAPI.getByStatus.mockResolvedValue({ data: { data: [mockTask], total: 1 } });

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

    // Mock API to return the same tasks
    tasksAPI.getByStatus.mockResolvedValue({ data: { data: mockTasks, total: 3 } });

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
