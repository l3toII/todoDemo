import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import inboxReducer from '../../../features/inbox/inboxSlice';
import QuickCaptureInput from '../../../components/QuickCaptureInput';

// Mock the API module
vi.mock('../../../services/api', () => ({
  tasksAPI: {
    getInbox: vi.fn(),
    getInboxCount: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    complete: vi.fn(),
  },
}));

import { tasksAPI } from '../../../services/api';

describe('QuickCaptureInput', () => {
  const createStore = (inboxState = {}) => {
    return configureStore({
      reducer: {
        inbox: inboxReducer,
      },
      preloadedState: {
        inbox: {
          tasks: [],
          count: 0,
          hasOverflow: false,
          isLoading: false,
          error: null,
          pendingTasks: {},
          ...inboxState,
        },
      },
    });
  };

  const renderComponent = (store, props = {}) => {
    return render(
      <Provider store={store}>
        <QuickCaptureInput {...props} />
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tasksAPI.create.mockResolvedValue({
      data: {
        task: {
          id: 'new-task-uuid',
          title: 'Test Task',
          notes: null,
          status: 'inbox',
          position: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    });
  });

  describe('rendering', () => {
    it('renders input field with placeholder', () => {
      const store = createStore();
      renderComponent(store);

      expect(screen.getByPlaceholderText(/what's on your mind/i)).toBeInTheDocument();
    });

    it('renders submit button', () => {
      const store = createStore();
      renderComponent(store);

      expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument();
    });

    it('renders keyboard shortcut tip', () => {
      const store = createStore();
      renderComponent(store);

      expect(screen.getByText(/tip: press/i)).toBeInTheDocument();
      expect(screen.getByText('Ctrl')).toBeInTheDocument();
      expect(screen.getByText('N')).toBeInTheDocument();
    });

    it('has aria-label for accessibility', () => {
      const store = createStore();
      renderComponent(store);

      expect(screen.getByLabelText(/quick capture input/i)).toBeInTheDocument();
    });
  });

  describe('autoFocus', () => {
    it('focuses input when autoFocus is true', async () => {
      const store = createStore();
      renderComponent(store, { autoFocus: true });

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/what's on your mind/i)).toHaveFocus();
      });
    });

    it('does not focus input when autoFocus is false', () => {
      const store = createStore();
      renderComponent(store, { autoFocus: false });

      expect(screen.getByPlaceholderText(/what's on your mind/i)).not.toHaveFocus();
    });
  });

  describe('input behavior', () => {
    it('allows typing in the input', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderComponent(store);

      const input = screen.getByPlaceholderText(/what's on your mind/i);
      await user.type(input, 'New task title');

      expect(input).toHaveValue('New task title');
    });

    it('clears input after successful submission', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderComponent(store);

      const input = screen.getByPlaceholderText(/what's on your mind/i);
      await user.type(input, 'New task');
      await user.click(screen.getByRole('button', { name: /add task/i }));

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });
  });

  describe('submission', () => {
    it('submits on Enter key press', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderComponent(store);

      const input = screen.getByPlaceholderText(/what's on your mind/i);
      await user.type(input, 'Task via Enter{Enter}');

      await waitFor(() => {
        expect(tasksAPI.create).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Task via Enter' })
        );
      });
    });

    it('submits on button click', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderComponent(store);

      const input = screen.getByPlaceholderText(/what's on your mind/i);
      await user.type(input, 'Task via button');
      await user.click(screen.getByRole('button', { name: /add task/i }));

      await waitFor(() => {
        expect(tasksAPI.create).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Task via button' })
        );
      });
    });

    it('does not submit empty input', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderComponent(store);

      await user.click(screen.getByRole('button', { name: /add task/i }));

      expect(tasksAPI.create).not.toHaveBeenCalled();
    });

    it('does not submit whitespace-only input', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderComponent(store);

      const input = screen.getByPlaceholderText(/what's on your mind/i);
      await user.type(input, '   ');
      await user.click(screen.getByRole('button', { name: /add task/i }));

      expect(tasksAPI.create).not.toHaveBeenCalled();
    });

    it('trims whitespace from title before submission', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderComponent(store);

      const input = screen.getByPlaceholderText(/what's on your mind/i);
      await user.type(input, '  Trimmed task  {Enter}');

      await waitFor(() => {
        expect(tasksAPI.create).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Trimmed task' })
        );
      });
    });

    it('calls onTaskCreated callback after successful creation', async () => {
      const user = userEvent.setup();
      const store = createStore();
      const onTaskCreated = vi.fn();
      renderComponent(store, { onTaskCreated });

      const input = screen.getByPlaceholderText(/what's on your mind/i);
      await user.type(input, 'New task{Enter}');

      await waitFor(() => {
        expect(onTaskCreated).toHaveBeenCalled();
      });
    });
  });

  describe('optimistic updates', () => {
    it('adds task to store optimistically before API response', async () => {
      const user = userEvent.setup();
      // Make API slow to verify optimistic update
      tasksAPI.create.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { task: {} } }), 100))
      );

      const store = createStore();
      renderComponent(store);

      const input = screen.getByPlaceholderText(/what's on your mind/i);
      await user.type(input, 'Optimistic task{Enter}');

      // Check store immediately - should have optimistic task
      const state = store.getState().inbox;
      expect(state.tasks.length).toBe(1);
      expect(state.tasks[0].title).toBe('Optimistic task');
      expect(state.tasks[0].isOptimistic).toBe(true);
    });
  });

  describe('button state', () => {
    it('disables button when input is empty', () => {
      const store = createStore();
      renderComponent(store);

      expect(screen.getByRole('button', { name: /add task/i })).toBeDisabled();
    });

    it('enables button when input has value', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderComponent(store);

      const input = screen.getByPlaceholderText(/what's on your mind/i);
      await user.type(input, 'Some text');

      expect(screen.getByRole('button', { name: /add task/i })).not.toBeDisabled();
    });

    it('disables button during submission', async () => {
      const user = userEvent.setup();
      let resolveCreate;
      tasksAPI.create.mockImplementation(
        () => new Promise((resolve) => { resolveCreate = resolve; })
      );

      const store = createStore();
      renderComponent(store);

      const input = screen.getByPlaceholderText(/what's on your mind/i);
      await user.type(input, 'Test task');
      await user.click(screen.getByRole('button', { name: /add task/i }));

      // Button should be disabled while submitting
      expect(screen.getByRole('button', { name: /add task/i })).toBeDisabled();

      // Resolve the promise
      resolveCreate({ data: { task: { id: 'test', title: 'Test task' } } });
    });

    it('disables input during submission', async () => {
      const user = userEvent.setup();
      let resolveCreate;
      tasksAPI.create.mockImplementation(
        () => new Promise((resolve) => { resolveCreate = resolve; })
      );

      const store = createStore();
      renderComponent(store);

      const input = screen.getByPlaceholderText(/what's on your mind/i);
      await user.type(input, 'Test task');
      await user.click(screen.getByRole('button', { name: /add task/i }));

      // Input should be disabled while submitting
      expect(input).toBeDisabled();

      // Resolve the promise
      resolveCreate({ data: { task: { id: 'test', title: 'Test task' } } });
    });
  });

  describe('loading state', () => {
    it('shows spinner during submission', async () => {
      const user = userEvent.setup();
      let resolveCreate;
      tasksAPI.create.mockImplementation(
        () => new Promise((resolve) => { resolveCreate = resolve; })
      );

      const store = createStore();
      renderComponent(store);

      const input = screen.getByPlaceholderText(/what's on your mind/i);
      await user.type(input, 'Test task');
      await user.click(screen.getByRole('button', { name: /add task/i }));

      // Should show spinner (svg with animate-spin class)
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();

      // Resolve the promise
      resolveCreate({ data: { task: { id: 'test', title: 'Test task' } } });
    });
  });

  describe('error handling', () => {
    it('displays error message on API failure', async () => {
      const user = userEvent.setup();
      tasksAPI.create.mockRejectedValue({
        response: { data: { error: 'Server error occurred' } },
      });

      const store = createStore();
      renderComponent(store);

      const input = screen.getByPlaceholderText(/what's on your mind/i);
      await user.type(input, 'Failing task{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/server error occurred/i)).toBeInTheDocument();
      });
    });

    it('displays generic error message when no specific message', async () => {
      const user = userEvent.setup();
      tasksAPI.create.mockRejectedValue(new Error('Network error'));

      const store = createStore();
      renderComponent(store);

      const input = screen.getByPlaceholderText(/what's on your mind/i);
      await user.type(input, 'Failing task{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('clears error on new input', async () => {
      const user = userEvent.setup();
      tasksAPI.create.mockRejectedValueOnce({
        response: { data: { error: 'Server error' } },
      });

      const store = createStore();
      renderComponent(store);

      const input = screen.getByPlaceholderText(/what's on your mind/i);
      await user.type(input, 'Failing task{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Type again to clear error
      await user.type(input, 'a');

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('does not call onTaskCreated on failure', async () => {
      const user = userEvent.setup();
      tasksAPI.create.mockRejectedValue({
        response: { data: { error: 'Server error' } },
      });

      const store = createStore();
      const onTaskCreated = vi.fn();
      renderComponent(store, { onTaskCreated });

      const input = screen.getByPlaceholderText(/what's on your mind/i);
      await user.type(input, 'Failing task{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(onTaskCreated).not.toHaveBeenCalled();
    });
  });

  describe('input border styling', () => {
    it('has normal border by default', () => {
      const store = createStore();
      renderComponent(store);

      const input = screen.getByPlaceholderText(/what's on your mind/i);
      expect(input).toHaveClass('border-gray-300');
    });

    it('has red border when error exists', async () => {
      const user = userEvent.setup();
      tasksAPI.create.mockRejectedValue({
        response: { data: { error: 'Error' } },
      });

      const store = createStore();
      renderComponent(store);

      const input = screen.getByPlaceholderText(/what's on your mind/i);
      await user.type(input, 'Task{Enter}');

      await waitFor(() => {
        expect(input).toHaveClass('border-red-300');
      });
    });
  });

  describe('refocus after submission', () => {
    it('refocuses input after successful submission', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderComponent(store);

      const input = screen.getByPlaceholderText(/what's on your mind/i);
      await user.type(input, 'New task{Enter}');

      await waitFor(() => {
        expect(input).toHaveFocus();
      });
    });

    it('refocuses input after failed submission', async () => {
      const user = userEvent.setup();
      tasksAPI.create.mockRejectedValue({
        response: { data: { error: 'Error' } },
      });

      const store = createStore();
      renderComponent(store);

      const input = screen.getByPlaceholderText(/what's on your mind/i);
      await user.type(input, 'Failing task{Enter}');

      await waitFor(() => {
        expect(input).toHaveFocus();
      });
    });
  });

  describe('< 3 interactions requirement', () => {
    it('creates task with just type and Enter (2 interactions)', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderComponent(store);

      const input = screen.getByPlaceholderText(/what's on your mind/i);

      // Interaction 1: Type
      await user.type(input, 'Quick task');

      // Interaction 2: Press Enter
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(tasksAPI.create).toHaveBeenCalled();
      });
    });
  });
});
