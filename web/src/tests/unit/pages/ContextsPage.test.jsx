import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import contextsReducer from '../../../features/contexts/contextsSlice';
import ContextsPage from '../../../pages/ContextsPage';

// Mock the API module
vi.mock('../../../services/api', () => ({
  contextsAPI: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { contextsAPI } from '../../../services/api';

describe('ContextsPage', () => {
  const mockDefaultContext = {
    id: 'ctx-default-1',
    name: '@Office',
    icon: 'building',
    color: '#4A90D9',
    is_default: true,
    status: 'active',
    position: 0,
  };

  const mockDefaultContext2 = {
    id: 'ctx-default-2',
    name: '@Home',
    icon: 'home',
    color: '#50C878',
    is_default: true,
    status: 'active',
    position: 1,
  };

  const mockCustomContext = {
    id: 'ctx-custom-1',
    name: '@Meeting',
    icon: 'calendar',
    color: '#9B59B6',
    is_default: false,
    status: 'active',
    position: 2,
    user_id: 'user-1',
  };

  const mockCustomContext2 = {
    id: 'ctx-custom-2',
    name: '@Gym',
    icon: null,
    color: '#FF6B6B',
    is_default: false,
    status: 'active',
    position: 3,
    user_id: 'user-1',
  };

  const createStore = (contextsState = {}) => {
    return configureStore({
      reducer: {
        contexts: contextsReducer,
      },
      preloadedState: {
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
          <ContextsPage />
        </MemoryRouter>
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    contextsAPI.getAll.mockResolvedValue({
      data: { contexts: [], count: 0 },
    });
    contextsAPI.create.mockResolvedValue({
      data: { context: mockCustomContext, message: 'Context created successfully' },
    });
    contextsAPI.update.mockResolvedValue({
      data: { context: { ...mockCustomContext, name: '@Updated' }, message: 'Context updated successfully' },
    });
    contextsAPI.delete.mockResolvedValue({
      data: { message: 'Context archived successfully' },
    });
  });

  describe('rendering', () => {
    it('renders page title and description', async () => {
      const store = createStore();
      renderPage(store);

      expect(screen.getByRole('heading', { name: /contexts/i })).toBeInTheDocument();
      expect(screen.getByText(/organize your actions by situation/i)).toBeInTheDocument();
    });

    it('renders contexts count badge', async () => {
      const store = createStore({
        contexts: [mockDefaultContext, mockDefaultContext2, mockCustomContext],
      });
      renderPage(store);

      expect(screen.getByText('3 contexts')).toBeInTheDocument();
    });

    it('renders singular context count', async () => {
      const store = createStore({
        contexts: [mockDefaultContext],
      });
      renderPage(store);

      expect(screen.getByText('1 context')).toBeInTheDocument();
    });

    it('renders create new context button', async () => {
      const store = createStore();
      renderPage(store);

      expect(screen.getByRole('button', { name: /new context/i })).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows loading spinner when loading with no contexts', async () => {
      const store = createStore({ loading: true, contexts: [] });
      renderPage(store);

      expect(screen.getByText(/loading contexts/i)).toBeInTheDocument();
    });

    it('does not show loading spinner when contexts exist', async () => {
      const store = createStore({ loading: true, contexts: [mockDefaultContext] });
      renderPage(store);

      expect(screen.queryByText(/loading contexts/i)).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no contexts and not loading', async () => {
      contextsAPI.getAll.mockResolvedValue({
        data: { contexts: [], count: 0 },
      });
      const store = createStore({ contexts: [], loading: false });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByText(/no contexts yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('contexts list', () => {
    it('renders default contexts section', async () => {
      const store = createStore({
        contexts: [mockDefaultContext, mockDefaultContext2],
      });
      renderPage(store);

      expect(screen.getByText('Default Contexts')).toBeInTheDocument();
    });

    it('renders custom contexts section', async () => {
      const store = createStore({
        contexts: [mockDefaultContext, mockCustomContext],
      });
      renderPage(store);

      expect(screen.getByText('Custom Contexts')).toBeInTheDocument();
    });

    it('renders context names', async () => {
      const store = createStore({
        contexts: [mockDefaultContext, mockCustomContext],
      });
      renderPage(store);

      expect(screen.getByText('@Office')).toBeInTheDocument();
      expect(screen.getByText('@Meeting')).toBeInTheDocument();
    });

    it('shows default badge for default contexts', async () => {
      const store = createStore({
        contexts: [mockDefaultContext],
      });
      renderPage(store);

      expect(screen.getByText('Default')).toBeInTheDocument();
    });

    it('shows edit button only for custom contexts', async () => {
      const store = createStore({
        contexts: [mockDefaultContext, mockCustomContext],
      });
      renderPage(store);

      // Should have edit button for custom context
      expect(screen.getByRole('button', { name: /edit "@meeting"/i })).toBeInTheDocument();

      // Should not have edit button for default context
      expect(screen.queryByRole('button', { name: /edit "@office"/i })).not.toBeInTheDocument();
    });

    it('shows delete button only for custom contexts', async () => {
      const store = createStore({
        contexts: [mockDefaultContext, mockCustomContext],
      });
      renderPage(store);

      // Should have delete button for custom context
      expect(screen.getByRole('button', { name: /delete "@meeting"/i })).toBeInTheDocument();

      // Should not have delete button for default context
      expect(screen.queryByRole('button', { name: /delete "@office"/i })).not.toBeInTheDocument();
    });

    it('displays context colors as visual indicators', async () => {
      const store = createStore({
        contexts: [mockDefaultContext],
      });
      renderPage(store);

      // Look for color indicator element
      const colorIndicator = screen.getByTestId(`context-color-${mockDefaultContext.id}`);
      expect(colorIndicator).toHaveStyle({ backgroundColor: mockDefaultContext.color });
    });
  });

  describe('error handling', () => {
    it('displays error message when error exists', async () => {
      contextsAPI.getAll.mockRejectedValue({
        response: { data: { error: 'Failed to fetch contexts' } },
      });
      const store = createStore();
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(screen.getByText('Failed to fetch contexts')).toBeInTheDocument();
    });

    it('allows dismissing error message', async () => {
      const user = userEvent.setup();
      contextsAPI.getAll.mockRejectedValue({
        response: { data: { error: 'Some error' } },
      });
      const store = createStore();
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      const alert = screen.getByRole('alert');
      const closeButton = within(alert).getByRole('button');
      await user.click(closeButton);

      await waitFor(() => {
        expect(store.getState().contexts.error).toBeNull();
      });
    });
  });

  describe('data fetching', () => {
    it('fetches contexts on mount', async () => {
      const store = createStore();
      renderPage(store);

      await waitFor(() => {
        expect(contextsAPI.getAll).toHaveBeenCalled();
      });
    });
  });

  describe('create context', () => {
    it('opens create modal when clicking new context button', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderPage(store);

      await user.click(screen.getByRole('button', { name: /new context/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      expect(screen.getByText('Create New Context')).toBeInTheDocument();
    });

    it('shows name input in create modal', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderPage(store);

      await user.click(screen.getByRole('button', { name: /new context/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      });
    });

    it('validates that name starts with @', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderPage(store);

      await user.click(screen.getByRole('button', { name: /new context/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/name/i);
      await user.type(input, 'InvalidName');

      const submitButton = screen.getByRole('button', { name: /create$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/context name must start with @/i)).toBeInTheDocument();
      });
    });

    it('creates context when form is valid', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderPage(store);

      await user.click(screen.getByRole('button', { name: /new context/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/name/i);
      await user.type(input, '@NewContext');

      const submitButton = screen.getByRole('button', { name: /create$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(contextsAPI.create).toHaveBeenCalledWith(
          expect.objectContaining({ name: '@NewContext' })
        );
      });
    });

    it('closes modal after successful creation', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderPage(store);

      await user.click(screen.getByRole('button', { name: /new context/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/name/i);
      await user.type(input, '@NewContext');

      const submitButton = screen.getByRole('button', { name: /create$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('closes modal on cancel', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderPage(store);

      await user.click(screen.getByRole('button', { name: /new context/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('edit context', () => {
    it('opens edit modal when clicking edit button', async () => {
      const user = userEvent.setup();
      // Mock API to return the context so it stays in state after fetch
      contextsAPI.getAll.mockResolvedValue({
        data: { contexts: [mockCustomContext], count: 1 },
      });
      const store = createStore({
        contexts: [mockCustomContext],
      });
      renderPage(store);

      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      expect(screen.getByText('Edit Context')).toBeInTheDocument();
    });

    it('pre-fills form with context data', async () => {
      const user = userEvent.setup();
      // Mock API to return the context so it stays in state after fetch
      contextsAPI.getAll.mockResolvedValue({
        data: { contexts: [mockCustomContext], count: 1 },
      });
      const store = createStore({
        contexts: [mockCustomContext],
      });
      renderPage(store);

      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toHaveValue('@Meeting');
      });
    });

    it('updates context when form is submitted', async () => {
      const user = userEvent.setup();
      // Mock API to return the context so it stays in state after fetch
      contextsAPI.getAll.mockResolvedValue({
        data: { contexts: [mockCustomContext], count: 1 },
      });
      const store = createStore({
        contexts: [mockCustomContext],
      });
      renderPage(store);

      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/name/i);
      await user.clear(input);
      await user.type(input, '@Updated');

      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(contextsAPI.update).toHaveBeenCalledWith(
          mockCustomContext.id,
          expect.objectContaining({ name: '@Updated' })
        );
      });
    });
  });

  describe('delete context', () => {
    it('shows confirmation dialog when clicking delete', async () => {
      const user = userEvent.setup();
      // Mock API to return the context so it stays in state after fetch
      contextsAPI.getAll.mockResolvedValue({
        data: { contexts: [mockCustomContext], count: 1 },
      });
      const store = createStore({
        contexts: [mockCustomContext],
      });
      renderPage(store);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });
    });

    it('deletes context when confirmed', async () => {
      const user = userEvent.setup();
      // Mock API to return the context so it stays in state after fetch
      contextsAPI.getAll.mockResolvedValue({
        data: { contexts: [mockCustomContext], count: 1 },
      });
      const store = createStore({
        contexts: [mockCustomContext],
      });
      renderPage(store);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(contextsAPI.delete).toHaveBeenCalledWith(mockCustomContext.id);
      });
    });

    it('cancels delete when clicking cancel', async () => {
      const user = userEvent.setup();
      // Mock API to return the context so it stays in state after fetch
      contextsAPI.getAll.mockResolvedValue({
        data: { contexts: [mockCustomContext], count: 1 },
      });
      const store = createStore({
        contexts: [mockCustomContext],
      });
      renderPage(store);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
      });
      expect(contextsAPI.delete).not.toHaveBeenCalled();
    });
  });

  describe('color picker', () => {
    it('shows color picker in create modal', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderPage(store);

      await user.click(screen.getByRole('button', { name: /new context/i }));

      await waitFor(() => {
        // Check for Color label text
        expect(screen.getByText('Color')).toBeInTheDocument();
        // And verify color options exist
        expect(screen.getByTestId('color-option-#4A90D9')).toBeInTheDocument();
      });
    });

    it('allows selecting a color', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderPage(store);

      await user.click(screen.getByRole('button', { name: /new context/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/name/i);
      await user.type(input, '@NewContext');

      // Select a color (assuming preset colors exist)
      const colorOption = screen.getByTestId('color-option-#FF6B6B');
      await user.click(colorOption);

      const submitButton = screen.getByRole('button', { name: /create$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(contextsAPI.create).toHaveBeenCalledWith(
          expect.objectContaining({ color: '#FF6B6B' })
        );
      });
    });
  });
});
