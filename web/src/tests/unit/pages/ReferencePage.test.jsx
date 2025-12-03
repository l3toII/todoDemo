import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import tasksReducer from '../../../features/tasks/tasksSlice';
import contextsReducer from '../../../features/contexts/contextsSlice';
import ReferencePage from '../../../pages/ReferencePage';

// Mock the API module
vi.mock('../../../services/api', () => ({
  tasksAPI: {
    getByStatus: vi.fn(),
    delete: vi.fn(),
  },
  contextsAPI: {
    getAll: vi.fn(),
  },
}));

import { tasksAPI, contextsAPI } from '../../../services/api';

describe('ReferencePage', () => {
  const mockItem1 = {
    id: 'ref-1',
    title: 'Meeting notes from Q4 planning',
    notes: 'Key decisions: budget approved, timeline confirmed',
    status: 'reference',
    energy_level: null,
    time_estimate: null,
    due_date: null,
    contexts: [{ id: 'ctx-1', name: '@Work' }],
    created_at: '2025-11-15T10:00:00Z',
    updated_at: '2025-11-15T10:00:00Z',
  };

  const mockItem2 = {
    id: 'ref-2',
    title: 'Passport number',
    notes: 'AB123456',
    status: 'reference',
    energy_level: null,
    time_estimate: null,
    due_date: null,
    contexts: [{ id: 'ctx-2', name: '@Personal' }],
    created_at: '2025-10-20T10:00:00Z',
    updated_at: '2025-10-20T10:00:00Z',
  };

  const mockItem3 = {
    id: 'ref-3',
    title: 'Recipe for chocolate cake',
    notes: 'Grandmas secret recipe',
    status: 'reference',
    energy_level: null,
    time_estimate: null,
    due_date: null,
    contexts: [],
    created_at: '2025-09-01T10:00:00Z',
    updated_at: '2025-09-01T10:00:00Z',
  };

  const mockContexts = [
    { id: 'ctx-1', name: '@Work', is_default: false, status: 'active' },
    { id: 'ctx-2', name: '@Personal', is_default: false, status: 'active' },
  ];

  const createStore = (tasksState = {}, contextsState = {}) => {
    return configureStore({
      reducer: {
        tasks: tasksReducer,
        contexts: contextsReducer,
      },
      preloadedState: {
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
          ...tasksState,
        },
        contexts: {
          contexts: [],
          loading: false,
          error: null,
          ...contextsState,
        },
      },
    });
  };

  const renderPage = (store) => {
    return render(
      <Provider store={store}>
        <MemoryRouter>
          <ReferencePage />
        </MemoryRouter>
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tasksAPI.getByStatus.mockResolvedValue({
      data: { tasks: [], count: 0 },
    });
    tasksAPI.delete.mockResolvedValue({});
    contextsAPI.getAll.mockResolvedValue({
      data: { contexts: mockContexts, count: mockContexts.length },
    });
  });

  describe('loading state', () => {
    it('should show loading spinner while fetching', () => {
      const store = createStore({ loading: true });
      renderPage(store);

      expect(screen.getByText(/loading reference/i)).toBeInTheDocument();
    });
  });

  describe('reference list', () => {
    it('should render items with reference status', async () => {
      tasksAPI.getByStatus.mockResolvedValue({
        data: { tasks: [mockItem1, mockItem2, mockItem3], count: 3 },
      });
      const store = createStore({ reference: [mockItem1, mockItem2, mockItem3] });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByText('Meeting notes from Q4 planning')).toBeInTheDocument();
        expect(screen.getByText('Passport number')).toBeInTheDocument();
        expect(screen.getByText('Recipe for chocolate cake')).toBeInTheDocument();
      });
    });

    it('should show empty state when no items', async () => {
      tasksAPI.getByStatus.mockResolvedValue({
        data: { tasks: [], count: 0 },
      });
      const store = createStore({ reference: [] });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByText(/no reference items/i)).toBeInTheDocument();
      });
    });

    it('should show error message on fetch failure', async () => {
      tasksAPI.getByStatus.mockRejectedValue({
        response: { data: { message: 'Failed to fetch items' } },
      });
      const store = createStore();
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
      });
    });

    it('should display item count in header', async () => {
      const store = createStore({ reference: [mockItem1, mockItem2] });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });
  });

  describe('search', () => {
    it('should filter items by search query', async () => {
      // Mock API to return all items
      tasksAPI.getByStatus.mockResolvedValue({
        data: { tasks: [mockItem1, mockItem2, mockItem3], count: 3 },
      });
      const store = createStore({ reference: [mockItem1, mockItem2, mockItem3] });
      renderPage(store);

      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Meeting notes from Q4 planning')).toBeInTheDocument();
      });

      // Type in search box
      const searchInput = screen.getByPlaceholderText(/search reference/i);
      await user.type(searchInput, 'passport');

      await waitFor(() => {
        // Should show matching item
        expect(screen.getByText('Passport number')).toBeInTheDocument();
        // Should hide non-matching items
        expect(screen.queryByText('Meeting notes from Q4 planning')).not.toBeInTheDocument();
        expect(screen.queryByText('Recipe for chocolate cake')).not.toBeInTheDocument();
      });
    });

    it('should search in notes as well', async () => {
      // Mock API to return all items
      tasksAPI.getByStatus.mockResolvedValue({
        data: { tasks: [mockItem1, mockItem2, mockItem3], count: 3 },
      });
      const store = createStore({ reference: [mockItem1, mockItem2, mockItem3] });
      renderPage(store);

      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Recipe for chocolate cake')).toBeInTheDocument();
      });

      // Search for content in notes (case insensitive)
      const searchInput = screen.getByPlaceholderText(/search reference/i);
      await user.type(searchInput, 'grandma');

      await waitFor(() => {
        expect(screen.getByText('Recipe for chocolate cake')).toBeInTheDocument();
        expect(screen.queryByText('Meeting notes from Q4 planning')).not.toBeInTheDocument();
      });
    });
  });

  describe('item actions', () => {
    it('should allow deleting reference item', async () => {
      tasksAPI.getByStatus.mockResolvedValue({
        data: { tasks: [mockItem1], count: 1 },
      });
      const store = createStore({ reference: [mockItem1] });
      renderPage(store);

      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Meeting notes from Q4 planning')).toBeInTheDocument();
      });

      // Find and click the delete button
      const deleteButton = screen.getByRole('button', { name: /delete "meeting notes from q4 planning"/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(tasksAPI.delete).toHaveBeenCalledWith('ref-1');
      });
    });
  });

  describe('page header', () => {
    it('should display page title', () => {
      const store = createStore();
      renderPage(store);

      expect(screen.getByRole('heading', { name: /reference/i })).toBeInTheDocument();
    });

    it('should display GTD description', () => {
      const store = createStore();
      renderPage(store);

      expect(screen.getByText(/non-actionable information for later/i)).toBeInTheDocument();
    });
  });

  describe('refresh functionality', () => {
    it('should have refresh button', () => {
      const store = createStore();
      renderPage(store);

      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('should fetch items when refresh clicked', async () => {
      const store = createStore();
      renderPage(store);

      const user = userEvent.setup();
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(tasksAPI.getByStatus).toHaveBeenCalledWith('reference');
      });
    });
  });
});
