import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import projectsReducer from '../../../features/projects/projectsSlice';
import ProjectsPage from '../../../pages/ProjectsPage';

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

import { projectsAPI } from '../../../services/api';

describe('ProjectsPage', () => {
  const mockActiveProject = {
    id: 'proj-1',
    title: 'Website Redesign',
    outcome: 'Launch new website with improved UX',
    status: 'active',
    has_next_action: true,
    task_count: 5,
    next_action_count: 2,
    position: 0,
    created_at: '2025-12-01T10:00:00Z',
    updated_at: '2025-12-03T10:00:00Z',
  };

  const mockActiveProjectNoNextAction = {
    id: 'proj-2',
    title: 'API Integration',
    outcome: 'Integrate with third-party API',
    status: 'active',
    has_next_action: false,
    task_count: 3,
    next_action_count: 0,
    position: 1,
    created_at: '2025-12-01T11:00:00Z',
    updated_at: '2025-12-02T10:00:00Z',
  };

  const mockOnHoldProject = {
    id: 'proj-3',
    title: 'Mobile App',
    outcome: 'Native mobile application',
    status: 'on_hold',
    has_next_action: false,
    task_count: 10,
    next_action_count: 0,
    position: 2,
    created_at: '2025-11-01T10:00:00Z',
    updated_at: '2025-11-15T10:00:00Z',
  };

  const mockCompletedProject = {
    id: 'proj-4',
    title: 'Documentation',
    outcome: 'Complete project documentation',
    status: 'completed',
    has_next_action: false,
    task_count: 8,
    next_action_count: 0,
    position: 3,
    completed_at: '2025-12-01T10:00:00Z',
    created_at: '2025-10-01T10:00:00Z',
    updated_at: '2025-12-01T10:00:00Z',
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

  const renderPage = (store) => {
    return render(
      <Provider store={store}>
        <MemoryRouter>
          <ProjectsPage />
        </MemoryRouter>
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    projectsAPI.getAll.mockResolvedValue({
      data: { projects: [], count: 0 },
    });
    projectsAPI.create.mockResolvedValue({
      data: { project: mockActiveProject, message: 'Project created successfully' },
    });
    projectsAPI.update.mockResolvedValue({
      data: { project: { ...mockActiveProject, title: 'Updated Title' }, message: 'Project updated successfully' },
    });
    projectsAPI.delete.mockResolvedValue({
      data: { message: 'Project deleted successfully' },
    });
    projectsAPI.complete.mockResolvedValue({
      data: { project: { ...mockActiveProject, status: 'completed' }, message: 'Project completed' },
    });
    projectsAPI.hold.mockResolvedValue({
      data: { project: { ...mockActiveProject, status: 'on_hold' }, message: 'Project put on hold' },
    });
    projectsAPI.activate.mockResolvedValue({
      data: { project: { ...mockOnHoldProject, status: 'active' }, message: 'Project activated' },
    });
  });

  describe('rendering', () => {
    it('renders page title and description', async () => {
      const store = createStore();
      renderPage(store);

      expect(screen.getByRole('heading', { name: /projects/i })).toBeInTheDocument();
      expect(screen.getByText(/manage your multi-step outcomes/i)).toBeInTheDocument();
    });

    it('renders project count badge', async () => {
      const store = createStore({
        projects: [mockActiveProject, mockActiveProjectNoNextAction, mockOnHoldProject],
      });
      renderPage(store);

      expect(screen.getByText('3 projects')).toBeInTheDocument();
    });

    it('renders singular project count', async () => {
      const store = createStore({
        projects: [mockActiveProject],
      });
      renderPage(store);

      expect(screen.getByText('1 project')).toBeInTheDocument();
    });

    it('renders create new project button', async () => {
      const store = createStore();
      renderPage(store);

      expect(screen.getByRole('button', { name: /new project/i })).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows loading spinner when loading with no projects', async () => {
      const store = createStore({ loading: true, projects: [] });
      renderPage(store);

      expect(screen.getByText(/loading projects/i)).toBeInTheDocument();
    });

    it('does not show loading spinner when projects exist', async () => {
      const store = createStore({ loading: true, projects: [mockActiveProject] });
      renderPage(store);

      expect(screen.queryByText(/loading projects/i)).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no projects and not loading', async () => {
      projectsAPI.getAll.mockResolvedValue({
        data: { projects: [], count: 0 },
      });
      const store = createStore({ projects: [], loading: false });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByText(/no projects yet/i)).toBeInTheDocument();
      });
    });

    it('shows helpful message in empty state', async () => {
      const store = createStore({ projects: [], loading: false });
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByText(/create projects to organize/i)).toBeInTheDocument();
      });
    });
  });

  describe('projects list', () => {
    it('renders project titles', async () => {
      const store = createStore({
        projects: [mockActiveProject, mockActiveProjectNoNextAction],
      });
      renderPage(store);

      expect(screen.getByText('Website Redesign')).toBeInTheDocument();
      expect(screen.getByText('API Integration')).toBeInTheDocument();
    });

    it('shows status badge for each project', async () => {
      const store = createStore({
        projects: [mockActiveProject, mockOnHoldProject, mockCompletedProject],
      });
      renderPage(store);

      // Use getAllByText since filter dropdown also has these texts
      const activeBadges = screen.getAllByText('Active');
      const onHoldBadges = screen.getAllByText('On Hold');
      const completedBadges = screen.getAllByText('Completed');

      // Should have at least 2 (one in filter, one as badge)
      expect(activeBadges.length).toBeGreaterThanOrEqual(2);
      expect(onHoldBadges.length).toBeGreaterThanOrEqual(2);
      expect(completedBadges.length).toBeGreaterThanOrEqual(2);
    });

    it('shows task count for projects', async () => {
      const store = createStore({
        projects: [mockActiveProject],
      });
      renderPage(store);

      expect(screen.getByText(/5 tasks/i)).toBeInTheDocument();
    });

    it('shows outcome when available', async () => {
      const store = createStore({
        projects: [mockActiveProject],
      });
      renderPage(store);

      expect(screen.getByText('Launch new website with improved UX')).toBeInTheDocument();
    });
  });

  describe('status filter', () => {
    it('renders status filter dropdown', async () => {
      const store = createStore({
        projects: [mockActiveProject],
      });
      renderPage(store);

      expect(screen.getByRole('combobox', { name: /filter/i })).toBeInTheDocument();
    });

    it('has all status options', async () => {
      const store = createStore({
        projects: [mockActiveProject],
      });
      renderPage(store);

      const select = screen.getByRole('combobox', { name: /filter/i });
      expect(within(select).getByRole('option', { name: /all/i })).toBeInTheDocument();
      expect(within(select).getByRole('option', { name: /active/i })).toBeInTheDocument();
      expect(within(select).getByRole('option', { name: /on hold/i })).toBeInTheDocument();
      expect(within(select).getByRole('option', { name: /completed/i })).toBeInTheDocument();
    });

    it('filters projects when status is selected', async () => {
      const user = userEvent.setup();
      projectsAPI.getAll.mockResolvedValue({
        data: { projects: [mockActiveProject, mockOnHoldProject, mockCompletedProject], count: 3 },
      });
      const store = createStore({
        projects: [mockActiveProject, mockOnHoldProject, mockCompletedProject],
      });
      renderPage(store);

      const select = screen.getByRole('combobox', { name: /filter/i });
      await user.selectOptions(select, 'active');

      // Active project should be visible
      expect(screen.getByText('Website Redesign')).toBeInTheDocument();
      // On hold project should not be visible
      expect(screen.queryByText('Mobile App')).not.toBeInTheDocument();
      // Completed project should not be visible
      expect(screen.queryByText('Documentation')).not.toBeInTheDocument();
    });
  });

  describe('needs attention indicator', () => {
    it('highlights projects without next action', async () => {
      const store = createStore({
        projects: [mockActiveProjectNoNextAction],
      });
      renderPage(store);

      // Should show warning indicator for project needing attention
      expect(screen.getByText(/needs attention/i)).toBeInTheDocument();
    });

    it('does not show warning for projects with next action', async () => {
      const store = createStore({
        projects: [mockActiveProject],
      });
      renderPage(store);

      // Should not show warning for project with next action
      expect(screen.queryByText(/needs attention/i)).not.toBeInTheDocument();
    });

    it('does not show warning for non-active projects', async () => {
      const store = createStore({
        projects: [mockOnHoldProject],
      });
      renderPage(store);

      // Should not show warning for on-hold project (even without next action)
      expect(screen.queryByText(/needs attention/i)).not.toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('displays error message when error exists', async () => {
      projectsAPI.getAll.mockRejectedValue({
        response: { data: { error: 'Failed to fetch projects' } },
      });
      const store = createStore();
      renderPage(store);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(screen.getByText('Failed to fetch projects')).toBeInTheDocument();
    });

    it('allows dismissing error message', async () => {
      const user = userEvent.setup();
      projectsAPI.getAll.mockRejectedValue({
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
        expect(store.getState().projects.error).toBeNull();
      });
    });
  });

  describe('data fetching', () => {
    it('fetches projects on mount', async () => {
      const store = createStore();
      renderPage(store);

      await waitFor(() => {
        expect(projectsAPI.getAll).toHaveBeenCalled();
      });
    });
  });

  describe('create project', () => {
    it('opens create modal when clicking new project button', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderPage(store);

      await user.click(screen.getByRole('button', { name: /new project/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      expect(screen.getByText('Create New Project')).toBeInTheDocument();
    });

    it('shows title input in create modal', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderPage(store);

      await user.click(screen.getByRole('button', { name: /new project/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      });
    });

    it('shows outcome input in create modal', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderPage(store);

      await user.click(screen.getByRole('button', { name: /new project/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/outcome/i)).toBeInTheDocument();
      });
    });

    it('validates that title is required', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderPage(store);

      await user.click(screen.getByRole('button', { name: /new project/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /create$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      });
    });

    it('creates project when form is valid', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderPage(store);

      await user.click(screen.getByRole('button', { name: /new project/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'New Project');

      const outcomeInput = screen.getByLabelText(/outcome/i);
      await user.type(outcomeInput, 'Achieve something great');

      const submitButton = screen.getByRole('button', { name: /create$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(projectsAPI.create).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'New Project',
            outcome: 'Achieve something great',
          })
        );
      });
    });

    it('closes modal after successful creation', async () => {
      const user = userEvent.setup();
      const store = createStore();
      renderPage(store);

      await user.click(screen.getByRole('button', { name: /new project/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'New Project');

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

      await user.click(screen.getByRole('button', { name: /new project/i }));

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

  describe('quick actions', () => {
    it('shows complete button for active projects', async () => {
      const user = userEvent.setup();
      projectsAPI.getAll.mockResolvedValue({
        data: { projects: [mockActiveProject], count: 1 },
      });
      const store = createStore({
        projects: [mockActiveProject],
      });
      renderPage(store);

      expect(screen.getByRole('button', { name: /complete/i })).toBeInTheDocument();
    });

    it('shows hold button for active projects', async () => {
      const store = createStore({
        projects: [mockActiveProject],
      });
      renderPage(store);

      expect(screen.getByRole('button', { name: /hold/i })).toBeInTheDocument();
    });

    it('shows activate button for on-hold projects', async () => {
      const store = createStore({
        projects: [mockOnHoldProject],
      });
      renderPage(store);

      expect(screen.getByRole('button', { name: /activate/i })).toBeInTheDocument();
    });

    it('completes project when complete button is clicked', async () => {
      const user = userEvent.setup();
      projectsAPI.getAll.mockResolvedValue({
        data: { projects: [mockActiveProject], count: 1 },
      });
      const store = createStore({
        projects: [mockActiveProject],
      });
      renderPage(store);

      const completeButton = screen.getByRole('button', { name: /complete/i });
      await user.click(completeButton);

      await waitFor(() => {
        expect(projectsAPI.complete).toHaveBeenCalledWith(mockActiveProject.id);
      });
    });

    it('puts project on hold when hold button is clicked', async () => {
      const user = userEvent.setup();
      projectsAPI.getAll.mockResolvedValue({
        data: { projects: [mockActiveProject], count: 1 },
      });
      const store = createStore({
        projects: [mockActiveProject],
      });
      renderPage(store);

      const holdButton = screen.getByRole('button', { name: /hold/i });
      await user.click(holdButton);

      await waitFor(() => {
        expect(projectsAPI.hold).toHaveBeenCalledWith(mockActiveProject.id);
      });
    });

    it('activates project when activate button is clicked', async () => {
      const user = userEvent.setup();
      projectsAPI.getAll.mockResolvedValue({
        data: { projects: [mockOnHoldProject], count: 1 },
      });
      const store = createStore({
        projects: [mockOnHoldProject],
      });
      renderPage(store);

      const activateButton = screen.getByRole('button', { name: /activate/i });
      await user.click(activateButton);

      await waitFor(() => {
        expect(projectsAPI.activate).toHaveBeenCalledWith(mockOnHoldProject.id);
      });
    });
  });

  describe('delete project', () => {
    it('shows delete button for projects', async () => {
      const store = createStore({
        projects: [mockActiveProject],
      });
      renderPage(store);

      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('shows confirmation dialog when clicking delete', async () => {
      const user = userEvent.setup();
      projectsAPI.getAll.mockResolvedValue({
        data: { projects: [mockActiveProject], count: 1 },
      });
      const store = createStore({
        projects: [mockActiveProject],
      });
      renderPage(store);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });
    });

    it('deletes project when confirmed', async () => {
      const user = userEvent.setup();
      projectsAPI.getAll.mockResolvedValue({
        data: { projects: [mockActiveProject], count: 1 },
      });
      const store = createStore({
        projects: [mockActiveProject],
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
        expect(projectsAPI.delete).toHaveBeenCalledWith(mockActiveProject.id);
      });
    });

    it('cancels delete when clicking cancel', async () => {
      const user = userEvent.setup();
      projectsAPI.getAll.mockResolvedValue({
        data: { projects: [mockActiveProject], count: 1 },
      });
      const store = createStore({
        projects: [mockActiveProject],
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
      expect(projectsAPI.delete).not.toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    it('renders project as clickable card', async () => {
      const store = createStore({
        projects: [mockActiveProject],
      });
      renderPage(store);

      // Project should be rendered with a link to detail page
      expect(screen.getByRole('link', { name: /website redesign/i })).toBeInTheDocument();
    });

    it('project card links to detail page', async () => {
      const store = createStore({
        projects: [mockActiveProject],
      });
      renderPage(store);

      const projectLink = screen.getByRole('link', { name: /website redesign/i });
      expect(projectLink).toHaveAttribute('href', `/projects/${mockActiveProject.id}`);
    });
  });
});
