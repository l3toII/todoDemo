/**
 * E2E Tests for Clarify Flow (P3)
 *
 * Tests the complete GTD clarification workflow:
 * - Actionable vs Non-actionable decisions
 * - 2-minute rule timer
 * - Single action vs Project conversion
 * - Delegate/Defer/Someday choices
 * - Reference and Trash handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import ClarifyPage from '../../pages/ClarifyPage';
import tasksReducer from '../../features/tasks/tasksSlice';
import authReducer from '../../features/auth/authSlice';
import accountReducer from '../../features/account/accountSlice';

// Mock the API module
vi.mock('../../services/api', () => ({
  tasksAPI: {
    getByStatus: vi.fn().mockResolvedValue({
      data: {
        tasks: [
          { id: '1', title: 'Review project proposal', status: 'inbox', notes: '' },
          { id: '2', title: 'Call dentist', status: 'inbox', notes: 'Schedule cleaning' },
          { id: '3', title: 'Interesting article about GTD', status: 'inbox', notes: '' },
        ],
        count: 3,
        next_cursor: null,
      },
    }),
    clarify: vi.fn().mockResolvedValue({ data: { id: '1', status: 'next_action' } }),
    complete: vi.fn().mockResolvedValue({ data: { id: '1', status: 'completed' } }),
    delete: vi.fn().mockResolvedValue({ data: { id: '1' } }),
  },
  projectsAPI: {
    create: vi.fn().mockResolvedValue({ data: { id: 'proj-1', title: 'New Project' } }),
  },
  authAPI: {
    logout: vi.fn(),
  },
  accountAPI: {
    getProfile: vi.fn().mockResolvedValue({ data: { email: 'test@example.com' } }),
  },
  default: {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

// Create a test store with initial authenticated state
const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      account: accountReducer,
      tasks: tasksReducer,
    },
    preloadedState: {
      auth: {
        isAuthenticated: true,
        user: { email: 'test@example.com' },
        loading: false,
        error: null,
      },
      account: {
        profile: { email: 'test@example.com' },
        loading: false,
        error: null,
      },
      tasks: {
        inbox: [
          { id: '1', title: 'Review project proposal', status: 'inbox', notes: '' },
          { id: '2', title: 'Call dentist', status: 'inbox', notes: 'Schedule cleaning' },
          { id: '3', title: 'Interesting article about GTD', status: 'inbox', notes: '' },
        ],
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
      ...preloadedState,
    },
  });
};

const renderWithProviders = (ui, { store = createTestStore(), route = '/clarify' } = {}) => {
  return {
    store,
    user: userEvent.setup(),
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </Provider>
    ),
  };
};

describe('Clarify Flow E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Page Loading', () => {
    it('displays the clarify page with inbox tasks', async () => {
      renderWithProviders(<ClarifyPage />);

      await waitFor(() => {
        expect(screen.getByText(/clarify & process/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/items remaining/i)).toBeInTheDocument();
    });

    it('shows the first inbox task for clarification', async () => {
      renderWithProviders(<ClarifyPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /is this actionable/i })).toBeInTheDocument();
      });
    });

    it('displays inbox zero when no tasks', async () => {
      // Mock API to return empty inbox for this specific test
      const { tasksAPI } = await import('../../services/api');
      tasksAPI.getByStatus.mockResolvedValueOnce({
        data: {
          tasks: [],
          count: 0,
          next_cursor: null,
        },
      });

      const emptyStore = createTestStore({
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

      renderWithProviders(<ClarifyPage />, { store: emptyStore });

      await waitFor(() => {
        expect(screen.getByText(/inbox zero/i)).toBeInTheDocument();
      });
    });
  });

  describe('Actionable Decision Flow', () => {
    it('navigates to 2-minute question when task is actionable', async () => {
      const { user } = renderWithProviders(<ClarifyPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /is this actionable/i })).toBeInTheDocument();
      });

      // Click the Yes button (contains "Yes" and "I can take action")
      const yesButton = screen.getByRole('button', { name: /yes.*i can take action/i });
      await user.click(yesButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /will it take less than 2 minutes/i })).toBeInTheDocument();
      });
    });

    it('navigates to non-actionable options when task is not actionable', async () => {
      const { user } = renderWithProviders(<ClarifyPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /is this actionable/i })).toBeInTheDocument();
      });

      // Click the No button (contains "No" and "It's not actionable")
      const noButton = screen.getByRole('button', { name: /no.*not actionable/i });
      await user.click(noButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /what is this/i })).toBeInTheDocument();
      });
    });
  });

  describe('2-Minute Rule Flow', () => {
    it('shows timer when task can be done in 2 minutes', async () => {
      const { user } = renderWithProviders(<ClarifyPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /is this actionable/i })).toBeInTheDocument();
      });

      const yesButton = screen.getByRole('button', { name: /yes.*i can take action/i });
      await user.click(yesButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /will it take less than 2 minutes/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /yes, under 2 min/i }));

      await waitFor(() => {
        expect(screen.getByText('2:00')).toBeInTheDocument();
      });
    });

    it('navigates to single/project question when task takes longer', async () => {
      const { user } = renderWithProviders(<ClarifyPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /is this actionable/i })).toBeInTheDocument();
      });

      const yesButton = screen.getByRole('button', { name: /yes.*i can take action/i });
      await user.click(yesButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /will it take less than 2 minutes/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /no, longer/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /single action or project/i })).toBeInTheDocument();
      });
    });
  });

  describe('Single Action Flow', () => {
    it('shows action options for single action', async () => {
      const { user } = renderWithProviders(<ClarifyPage />);

      // Navigate through: actionable -> takes longer -> single action
      await waitFor(() => expect(screen.getByRole('heading', { name: /is this actionable/i })).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /yes.*i can take action/i }));

      await waitFor(() => expect(screen.getByRole('heading', { name: /will it take less than 2 minutes/i })).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /no, longer/i }));

      await waitFor(() => expect(screen.getByRole('heading', { name: /single action or project/i })).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /single action.*one step/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /what should happen next/i })).toBeInTheDocument();
        expect(screen.getByText(/do it myself/i)).toBeInTheDocument();
        expect(screen.getByText(/delegate it/i)).toBeInTheDocument();
        expect(screen.getByText(/maybe later/i)).toBeInTheDocument();
      });
    });

    it('shows details form when "Do it myself" is selected', async () => {
      const { user } = renderWithProviders(<ClarifyPage />);

      // Navigate to action options
      await waitFor(() => expect(screen.getByRole('heading', { name: /is this actionable/i })).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /yes.*i can take action/i }));
      await waitFor(() => expect(screen.getByRole('heading', { name: /will it take less than 2 minutes/i })).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /no, longer/i }));
      await waitFor(() => expect(screen.getByRole('heading', { name: /single action or project/i })).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /single action.*one step/i }));
      await waitFor(() => expect(screen.getByRole('heading', { name: /what should happen next/i })).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /do it myself.*next actions/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /add details/i })).toBeInTheDocument();
        expect(screen.getByText(/energy level/i)).toBeInTheDocument();
      });
    });
  });

  describe('Project Creation Flow', () => {
    it('shows project form when project is selected', async () => {
      const { user } = renderWithProviders(<ClarifyPage />);

      // Navigate to single/project question
      await waitFor(() => expect(screen.getByRole('heading', { name: /is this actionable/i })).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /yes.*i can take action/i }));
      await waitFor(() => expect(screen.getByRole('heading', { name: /will it take less than 2 minutes/i })).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /no, longer/i }));
      await waitFor(() => expect(screen.getByRole('heading', { name: /single action or project/i })).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /project.*multiple steps/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create project/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/what's the desired outcome/i)).toBeInTheDocument();
      });
    });
  });

  describe('Non-Actionable Flow', () => {
    it('shows reference option for non-actionable items', async () => {
      const { user } = renderWithProviders(<ClarifyPage />);

      await waitFor(() => expect(screen.getByRole('heading', { name: /is this actionable/i })).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /no.*not actionable/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reference.*future/i })).toBeInTheDocument();
      });
    });

    it('shows trash option for non-actionable items', async () => {
      const { user } = renderWithProviders(<ClarifyPage />);

      await waitFor(() => expect(screen.getByRole('heading', { name: /is this actionable/i })).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /no.*not actionable/i }));

      await waitFor(() => {
        expect(screen.getByText(/trash it/i)).toBeInTheDocument();
      });
    });

    it('shows someday/maybe option for non-actionable items', async () => {
      const { user } = renderWithProviders(<ClarifyPage />);

      await waitFor(() => expect(screen.getByRole('heading', { name: /is this actionable/i })).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /no.*not actionable/i }));

      await waitFor(() => {
        expect(screen.getByText(/someday\/maybe/i)).toBeInTheDocument();
      });
    });
  });

  describe('Progress Tracking', () => {
    it('displays correct task count', async () => {
      renderWithProviders(<ClarifyPage />);

      await waitFor(() => {
        expect(screen.getByText(/task 1 of 3/i)).toBeInTheDocument();
      });
    });

    it('shows GTD tip', async () => {
      renderWithProviders(<ClarifyPage />);

      await waitFor(() => {
        expect(screen.getByText(/gtd tip/i)).toBeInTheDocument();
      });
    });

    it('shows up next preview', async () => {
      renderWithProviders(<ClarifyPage />);

      await waitFor(() => {
        expect(screen.getByText(/up next in your inbox/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API fails', async () => {
      // Mock API to reject for this specific test
      const { tasksAPI } = await import('../../services/api');
      tasksAPI.getByStatus.mockRejectedValueOnce({
        response: { data: { message: 'Failed to load tasks' } },
      });

      // Store with tasks so we don't hit "Inbox Zero"
      const errorStore = createTestStore({
        tasks: {
          inbox: [
            { id: '1', title: 'Review project proposal', status: 'inbox', notes: '' },
          ],
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

      renderWithProviders(<ClarifyPage />, { store: errorStore });

      await waitFor(() => {
        expect(screen.getByText(/failed to load tasks/i)).toBeInTheDocument();
      });
    });
  });

  describe('Skip Functionality', () => {
    it('shows skip button in wizard', async () => {
      renderWithProviders(<ClarifyPage />);

      await waitFor(() => {
        expect(screen.getByText(/skip/i)).toBeInTheDocument();
      });
    });
  });
});
