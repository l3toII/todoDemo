import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import contextsReducer from '../../../features/contexts/contextsSlice';
import ContextFilterSidebar from '../../../components/ContextFilterSidebar';

// Mock the API module
vi.mock('../../../services/api', () => ({
  contextsAPI: {
    getAll: vi.fn(),
  },
}));

import { contextsAPI } from '../../../services/api';

describe('ContextFilterSidebar', () => {
  const mockContextOffice = {
    id: 'ctx-1',
    name: '@Office',
    color: '#4A90D9',
    is_default: true,
    status: 'active',
    position: 0,
  };

  const mockContextHome = {
    id: 'ctx-2',
    name: '@Home',
    color: '#50C878',
    is_default: true,
    status: 'active',
    position: 1,
  };

  const mockContextCustom = {
    id: 'ctx-3',
    name: '@Meeting',
    color: '#9B59B6',
    is_default: false,
    status: 'active',
    position: 2,
  };

  const mockTaskCounts = {
    'ctx-1': 5,
    'ctx-2': 3,
    'ctx-3': 2,
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

  const defaultProps = {
    selectedContextId: null,
    onContextSelect: vi.fn(),
    taskCounts: {},
  };

  const renderComponent = (store, props = {}) => {
    return render(
      <Provider store={store}>
        <ContextFilterSidebar {...defaultProps} {...props} />
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    contextsAPI.getAll.mockResolvedValue({
      data: { contexts: [], count: 0 },
    });
  });

  describe('rendering', () => {
    it('renders all contexts as filter options', () => {
      const store = createStore({
        contexts: [mockContextOffice, mockContextHome, mockContextCustom],
      });
      contextsAPI.getAll.mockResolvedValue({
        data: { contexts: [mockContextOffice, mockContextHome, mockContextCustom], count: 3 },
      });
      renderComponent(store);

      expect(screen.getByText('@Office')).toBeInTheDocument();
      expect(screen.getByText('@Home')).toBeInTheDocument();
      expect(screen.getByText('@Meeting')).toBeInTheDocument();
    });

    it('renders "All" filter option', () => {
      const store = createStore({
        contexts: [mockContextOffice],
      });
      contextsAPI.getAll.mockResolvedValue({
        data: { contexts: [mockContextOffice], count: 1 },
      });
      renderComponent(store);

      expect(screen.getByText('All Contexts')).toBeInTheDocument();
    });

    it('displays context colors as visual indicators', () => {
      const store = createStore({
        contexts: [mockContextOffice],
      });
      contextsAPI.getAll.mockResolvedValue({
        data: { contexts: [mockContextOffice], count: 1 },
      });
      renderComponent(store);

      const colorIndicator = screen.getByTestId(`filter-color-${mockContextOffice.id}`);
      expect(colorIndicator).toHaveStyle({ backgroundColor: mockContextOffice.color });
    });
  });

  describe('active filter state', () => {
    it('highlights selected context', () => {
      const store = createStore({
        contexts: [mockContextOffice, mockContextHome],
      });
      contextsAPI.getAll.mockResolvedValue({
        data: { contexts: [mockContextOffice, mockContextHome], count: 2 },
      });
      renderComponent(store, { selectedContextId: mockContextOffice.id });

      const selectedItem = screen.getByRole('button', { name: /@Office/i });
      expect(selectedItem).toHaveClass('bg-blue-50');
    });

    it('highlights "All" when no context selected', () => {
      const store = createStore({
        contexts: [mockContextOffice],
      });
      contextsAPI.getAll.mockResolvedValue({
        data: { contexts: [mockContextOffice], count: 1 },
      });
      renderComponent(store, { selectedContextId: null });

      const allButton = screen.getByRole('button', { name: /all contexts/i });
      expect(allButton).toHaveClass('bg-blue-50');
    });
  });

  describe('context selection', () => {
    it('calls onContextSelect when context is clicked', async () => {
      const user = userEvent.setup();
      const onContextSelect = vi.fn();
      const store = createStore({
        contexts: [mockContextOffice],
      });
      contextsAPI.getAll.mockResolvedValue({
        data: { contexts: [mockContextOffice], count: 1 },
      });
      renderComponent(store, { onContextSelect });

      await user.click(screen.getByRole('button', { name: /@Office/i }));

      expect(onContextSelect).toHaveBeenCalledWith(mockContextOffice.id);
    });

    it('calls onContextSelect with null when "All" is clicked', async () => {
      const user = userEvent.setup();
      const onContextSelect = vi.fn();
      const store = createStore({
        contexts: [mockContextOffice],
      });
      contextsAPI.getAll.mockResolvedValue({
        data: { contexts: [mockContextOffice], count: 1 },
      });
      renderComponent(store, { selectedContextId: mockContextOffice.id, onContextSelect });

      await user.click(screen.getByRole('button', { name: /all contexts/i }));

      expect(onContextSelect).toHaveBeenCalledWith(null);
    });
  });

  describe('task counts', () => {
    it('displays task count for each context', () => {
      const store = createStore({
        contexts: [mockContextOffice, mockContextHome],
      });
      contextsAPI.getAll.mockResolvedValue({
        data: { contexts: [mockContextOffice, mockContextHome], count: 2 },
      });
      renderComponent(store, { taskCounts: mockTaskCounts });

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('displays total task count for "All" option', async () => {
      const store = createStore({
        contexts: [mockContextOffice, mockContextHome],
      });
      contextsAPI.getAll.mockResolvedValue({
        data: { contexts: [mockContextOffice, mockContextHome], count: 2 },
      });
      // Only pass task counts for the contexts we're displaying
      const filteredTaskCounts = {
        'ctx-1': 5,
        'ctx-2': 3,
      };
      renderComponent(store, { taskCounts: filteredTaskCounts });

      // Wait for contexts to be available
      await waitFor(() => {
        expect(screen.getByText('@Office')).toBeInTheDocument();
      });

      // Total should be 5 + 3 = 8
      expect(screen.getByTestId('all-contexts-count')).toHaveTextContent('8');
    });

    it('shows zero when no tasks for a context', () => {
      const store = createStore({
        contexts: [mockContextOffice],
      });
      contextsAPI.getAll.mockResolvedValue({
        data: { contexts: [mockContextOffice], count: 1 },
      });
      renderComponent(store, { taskCounts: {} });

      // When no task counts provided, should show 0
      const contextButton = screen.getByRole('button', { name: /@Office/i });
      expect(contextButton).toHaveTextContent('0');
    });
  });

  describe('responsive behavior', () => {
    it('renders toggle button', () => {
      const store = createStore({
        contexts: [mockContextOffice],
      });
      contextsAPI.getAll.mockResolvedValue({
        data: { contexts: [mockContextOffice], count: 1 },
      });
      renderComponent(store);

      expect(screen.getByRole('button', { name: /toggle/i })).toBeInTheDocument();
    });

    it('starts expanded by default', () => {
      const store = createStore({
        contexts: [mockContextOffice],
      });
      contextsAPI.getAll.mockResolvedValue({
        data: { contexts: [mockContextOffice], count: 1 },
      });
      renderComponent(store);

      expect(screen.getByTestId('context-sidebar')).toHaveAttribute('data-expanded', 'true');
    });

    it('collapses when toggle button is clicked', async () => {
      const user = userEvent.setup();
      const store = createStore({
        contexts: [mockContextOffice],
      });
      contextsAPI.getAll.mockResolvedValue({
        data: { contexts: [mockContextOffice], count: 1 },
      });
      renderComponent(store);

      const toggleButton = screen.getByRole('button', { name: /toggle/i });

      // Click to collapse (starts expanded)
      await user.click(toggleButton);
      await waitFor(() => {
        expect(screen.getByTestId('context-sidebar')).toHaveAttribute('data-expanded', 'false');
      });
    });

    it('expands when toggle button is clicked after collapsing', async () => {
      const user = userEvent.setup();
      const store = createStore({
        contexts: [mockContextOffice],
      });
      contextsAPI.getAll.mockResolvedValue({
        data: { contexts: [mockContextOffice], count: 1 },
      });
      renderComponent(store);

      const toggleButton = screen.getByRole('button', { name: /toggle/i });

      // Click to collapse
      await user.click(toggleButton);
      await waitFor(() => {
        expect(screen.getByTestId('context-sidebar')).toHaveAttribute('data-expanded', 'false');
      });

      // Click to expand
      await user.click(toggleButton);
      await waitFor(() => {
        expect(screen.getByTestId('context-sidebar')).toHaveAttribute('data-expanded', 'true');
      });
    });
  });

  describe('empty state', () => {
    it('shows message when no contexts exist', async () => {
      // Mock API to return empty contexts
      contextsAPI.getAll.mockResolvedValue({
        data: { contexts: [], count: 0 },
      });
      const store = createStore({
        contexts: [],
        loading: false,
      });
      renderComponent(store);

      // Wait for fetch to complete and show empty state
      await waitFor(() => {
        expect(screen.getByText(/no contexts/i)).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('shows loading indicator when loading', () => {
      const store = createStore({
        contexts: [],
        loading: true,
      });
      renderComponent(store);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });
});
