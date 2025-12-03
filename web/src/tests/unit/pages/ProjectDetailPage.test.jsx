import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import projectsReducer from '../../../features/projects/projectsSlice';
import ProjectDetailPage from '../../../pages/ProjectDetailPage';

// Mock the API module
vi.mock('../../../services/api', () => ({
  projectsAPI: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    complete: vi.fn(),
    hold: vi.fn(),
    activate: vi.fn(),
  },
}));

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { projectsAPI } from '../../../services/api';

describe('ProjectDetailPage', () => {
  const mockProject = {
    id: 'proj-1',
    title: 'Test Project',
    outcome: 'Achieve something great',
    status: 'active',
    has_next_action: true,
    task_count: 5,
    next_action_count: 2,
    tasks: [
      {
        id: 'task-1',
        title: 'First task',
        status: 'next_action',
        is_next_action: true,
      },
      {
        id: 'task-2',
        title: 'Second task',
        status: 'active',
        is_next_action: false,
      },
      {
        id: 'task-3',
        title: 'Third task',
        status: 'completed',
        is_next_action: false,
      },
    ],
  };

  const mockProjectNoNextAction = {
    id: 'proj-2',
    title: 'Project Without Next Action',
    outcome: 'Need to define next action',
    status: 'active',
    has_next_action: false,
    task_count: 2,
    next_action_count: 0,
    tasks: [
      {
        id: 'task-4',
        title: 'Completed task',
        status: 'completed',
        is_next_action: false,
      },
    ],
  };

  const mockCompletedProject = {
    id: 'proj-3',
    title: 'Completed Project',
    outcome: 'We did it!',
    status: 'completed',
    has_next_action: false,
    task_count: 3,
    next_action_count: 0,
    tasks: [],
  };

  const mockOnHoldProject = {
    id: 'proj-4',
    title: 'On Hold Project',
    outcome: 'Waiting for something',
    status: 'on_hold',
    has_next_action: false,
    task_count: 1,
    next_action_count: 0,
    tasks: [],
  };

  const createStore = (projectsState = {}) => {
    return configureStore({
      reducer: {
        projects: projectsReducer,
      },
      preloadedState: {
        projects: {
          projects: [],
          currentProject: null,
          loading: false,
          error: null,
          ...projectsState,
        },
      },
    });
  };

  const renderPage = (store, projectId = 'proj-1') => {
    return render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[`/projects/${projectId}`]}>
          <Routes>
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    projectsAPI.getById.mockResolvedValue({
      data: { project: mockProject },
    });
    projectsAPI.update.mockResolvedValue({
      data: { project: { ...mockProject, title: 'Updated Title' } },
    });
    projectsAPI.complete.mockResolvedValue({
      data: { project: { ...mockProject, status: 'completed' } },
    });
    projectsAPI.hold.mockResolvedValue({
      data: { project: { ...mockProject, status: 'on_hold' } },
    });
    projectsAPI.activate.mockResolvedValue({
      data: { project: { ...mockProject, status: 'active' } },
    });
    projectsAPI.delete.mockResolvedValue({
      data: { message: 'Project deleted' },
    });
  });

  describe('rendering', () => {
    it('should display project title', async () => {
      const store = createStore({ currentProject: mockProject });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: mockProject.title })).toBeInTheDocument();
      });
    });

    it('should display project outcome', async () => {
      const store = createStore({ currentProject: mockProject });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByText(mockProject.outcome)).toBeInTheDocument();
      });
    });

    it('should display project status badge', async () => {
      const store = createStore({ currentProject: mockProject });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });

    it('should show task count', async () => {
      const store = createStore({ currentProject: mockProject });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByText(/5 tasks/i)).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('should show loading spinner while fetching', async () => {
      const store = createStore({ loading: true, currentProject: null });
      renderPage(store);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('not found state', () => {
    it('should handle project not found', async () => {
      projectsAPI.getById.mockRejectedValue({
        response: { data: { error: 'Project not found' }, status: 404 },
      });
      const store = createStore({ currentProject: null, error: 'Project not found' });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /project not found/i })).toBeInTheDocument();
      });
    });

    it('should show back to projects link when not found', async () => {
      const store = createStore({ currentProject: null, error: 'Project not found' });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /back to projects/i })).toBeInTheDocument();
      });
    });
  });

  describe('next action section', () => {
    it('should show next action prominently', async () => {
      const store = createStore({ currentProject: mockProject });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Next Action' })).toBeInTheDocument();
        // First task appears in Next Action section and task list
        expect(screen.getAllByText('First task').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should show needs attention warning when no next action', async () => {
      const store = createStore({ currentProject: mockProjectNoNextAction });
      renderPage(store, 'proj-2');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /needs attention/i })).toBeInTheDocument();
      });
    });

    it('should suggest defining next action when missing', async () => {
      const store = createStore({ currentProject: mockProjectNoNextAction });
      renderPage(store, 'proj-2');

      await waitFor(() => {
        // Check for the message in Next Action section
        expect(screen.getByText(/no next action defined for this project/i)).toBeInTheDocument();
      });
    });
  });

  describe('task list', () => {
    it('should render task list', async () => {
      const store = createStore({ currentProject: mockProject });
      renderPage(store);

      await waitFor(() => {
        // Tasks appear in the tasks list section
        expect(screen.getAllByText('First task').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Second task')).toBeInTheDocument();
        expect(screen.getByText('Third task')).toBeInTheDocument();
      });
    });

    it('should show task status indicators', async () => {
      const store = createStore({ currentProject: mockProject });
      renderPage(store);

      await waitFor(() => {
        // Next action task should have indicator
        const taskElement = screen.getByTestId('task-task-1');
        expect(taskElement).toBeInTheDocument();
      });
    });

    it('should show empty tasks message when no tasks', async () => {
      const projectWithNoTasks = { ...mockProject, tasks: [], task_count: 0 };
      const store = createStore({ currentProject: projectWithNoTasks });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('status transitions', () => {
    it('should show complete button for active project', async () => {
      const store = createStore({ currentProject: mockProject });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /complete/i })).toBeInTheDocument();
      });
    });

    it('should show hold button for active project', async () => {
      const store = createStore({ currentProject: mockProject });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /hold/i })).toBeInTheDocument();
      });
    });

    it('should show activate button for on-hold project', async () => {
      const store = createStore({ currentProject: mockOnHoldProject });
      renderPage(store, 'proj-4');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /activate/i })).toBeInTheDocument();
      });
    });

    it('should not show transition buttons for completed project', async () => {
      const store = createStore({ currentProject: mockCompletedProject });
      renderPage(store, 'proj-3');

      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /complete/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /hold/i })).not.toBeInTheDocument();
      });
    });

    it('should complete project when clicking complete button', async () => {
      const user = userEvent.setup();
      const store = createStore({ currentProject: mockProject });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /complete/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /complete/i }));

      await waitFor(() => {
        expect(projectsAPI.complete).toHaveBeenCalledWith('proj-1');
      });
    });

    it('should put project on hold when clicking hold button', async () => {
      const user = userEvent.setup();
      const store = createStore({ currentProject: mockProject });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /hold/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /hold/i }));

      await waitFor(() => {
        expect(projectsAPI.hold).toHaveBeenCalledWith('proj-1');
      });
    });

    it('should activate project when clicking activate button', async () => {
      const user = userEvent.setup();
      projectsAPI.getById.mockResolvedValue({
        data: { project: mockOnHoldProject },
      });
      const store = createStore({ currentProject: mockOnHoldProject });
      renderPage(store, 'proj-4');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /activate/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /activate/i }));

      await waitFor(() => {
        expect(projectsAPI.activate).toHaveBeenCalledWith('proj-4');
      });
    });
  });

  describe('edit functionality', () => {
    it('should show edit button', async () => {
      const store = createStore({ currentProject: mockProject });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });
    });

    it('should open edit modal when clicking edit button', async () => {
      const user = userEvent.setup();
      const store = createStore({ currentProject: mockProject });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Edit Project')).toBeInTheDocument();
      });
    });

    it('should pre-fill edit form with project data', async () => {
      const user = userEvent.setup();
      const store = createStore({ currentProject: mockProject });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toHaveValue(mockProject.title);
        expect(screen.getByLabelText(/outcome/i)).toHaveValue(mockProject.outcome);
      });
    });

    it('should update project when saving edits', async () => {
      const user = userEvent.setup();
      const store = createStore({ currentProject: mockProject });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Title');

      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(projectsAPI.update).toHaveBeenCalledWith(
          'proj-1',
          expect.objectContaining({ title: 'Updated Title' })
        );
      });
    });

    it('should close edit modal on cancel', async () => {
      const user = userEvent.setup();
      const store = createStore({ currentProject: mockProject });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('delete functionality', () => {
    it('should show delete button', async () => {
      const store = createStore({ currentProject: mockProject });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });
    });

    it('should show delete confirmation dialog', async () => {
      const user = userEvent.setup();
      const store = createStore({ currentProject: mockProject });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /delete/i }));

      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });
    });

    it('should navigate to projects list after successful delete', async () => {
      const user = userEvent.setup();
      const store = createStore({ currentProject: mockProject });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /delete/i }));

      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /confirm/i }));

      await waitFor(() => {
        expect(projectsAPI.delete).toHaveBeenCalledWith('proj-1');
        expect(mockNavigate).toHaveBeenCalledWith('/projects');
      });
    });
  });

  describe('navigation', () => {
    it('should show back to projects link', async () => {
      const store = createStore({ currentProject: mockProject });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /back/i })).toBeInTheDocument();
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch project by id on mount', async () => {
      const store = createStore();
      renderPage(store);

      await waitFor(() => {
        expect(projectsAPI.getById).toHaveBeenCalledWith('proj-1');
      });
    });
  });

  describe('error handling', () => {
    it('should display error message', async () => {
      // Override the default mock to reject and prevent loading a project
      projectsAPI.getById.mockRejectedValue({
        response: { data: { error: 'Failed to load project' }, status: 500 },
      });
      // When there's an error, the error alert and project not found page shows
      const store = createStore({ error: 'Failed to load project', currentProject: null });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Failed to load project')).toBeInTheDocument();
      });
    });
  });
});
