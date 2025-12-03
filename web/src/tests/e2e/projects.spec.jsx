/**
 * E2E Tests for Project Management (P5.3)
 *
 * Tests the Project Management features:
 * - Projects list page
 * - Project detail page
 * - Project creation
 * - Project editing
 * - Project status transitions (complete, hold, activate)
 * - Project deletion
 * - Projects needing attention
 * - Navigation between list and detail
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import ProjectsPage from '../../pages/ProjectsPage';
import ProjectDetailPage from '../../pages/ProjectDetailPage';
import Navigation from '../../components/Navigation';
import projectsReducer from '../../features/projects/projectsSlice';
import authReducer from '../../features/auth/authSlice';
import accountReducer from '../../features/account/accountSlice';

// Mock projects for different states
const mockActiveProject = {
  id: 'proj-1',
  title: 'Build new website',
  outcome: 'Launch company website with all core features',
  status: 'active',
  has_next_action: true,
  task_count: 5,
  next_action_count: 2,
  tasks: [
    {
      id: 'task-1',
      title: 'Design homepage mockup',
      status: 'next_action',
      is_next_action: true,
    },
    {
      id: 'task-2',
      title: 'Set up hosting',
      status: 'active',
      is_next_action: false,
    },
    {
      id: 'task-3',
      title: 'Create logo',
      status: 'completed',
      is_next_action: false,
    },
  ],
  created_at: '2025-12-01T10:00:00Z',
  updated_at: '2025-12-01T10:00:00Z',
};

const mockProjectNeedsAttention = {
  id: 'proj-2',
  title: 'Q4 Marketing Campaign',
  outcome: 'Increase brand awareness by 20%',
  status: 'active',
  has_next_action: false,
  task_count: 3,
  next_action_count: 0,
  tasks: [
    {
      id: 'task-4',
      title: 'Completed prep work',
      status: 'completed',
      is_next_action: false,
    },
  ],
  created_at: '2025-11-15T10:00:00Z',
  updated_at: '2025-11-15T10:00:00Z',
};

const mockOnHoldProject = {
  id: 'proj-3',
  title: 'Office Renovation',
  outcome: 'Modern workspace for team',
  status: 'on_hold',
  has_next_action: false,
  task_count: 2,
  next_action_count: 0,
  tasks: [],
  created_at: '2025-10-01T10:00:00Z',
  updated_at: '2025-10-01T10:00:00Z',
};

const mockCompletedProject = {
  id: 'proj-4',
  title: 'Employee Handbook',
  outcome: 'Comprehensive company policies document',
  status: 'completed',
  has_next_action: false,
  task_count: 10,
  next_action_count: 0,
  tasks: [],
  created_at: '2025-09-01T10:00:00Z',
  updated_at: '2025-09-01T10:00:00Z',
};

const allMockProjects = [
  mockActiveProject,
  mockProjectNeedsAttention,
  mockOnHoldProject,
  mockCompletedProject,
];

// Mock the API module
vi.mock('../../services/api', () => ({
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

import { projectsAPI } from '../../services/api';

// Create a test store with authenticated state
const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      account: accountReducer,
      projects: projectsReducer,
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
      projects: {
        projects: allMockProjects,
        currentProject: null,
        loading: false,
        error: null,
      },
      ...preloadedState,
    },
  });
};

const renderWithProviders = (ui, { store = createTestStore(), route = '/' } = {}) => {
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

describe('Project Management E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    projectsAPI.getAll.mockResolvedValue({
      data: { projects: allMockProjects, count: allMockProjects.length },
    });
    projectsAPI.getById.mockImplementation((id) => {
      const project = allMockProjects.find((p) => p.id === id);
      if (project) {
        return Promise.resolve({ data: { project } });
      }
      return Promise.reject({ response: { data: { error: 'Project not found' }, status: 404 } });
    });
    projectsAPI.create.mockResolvedValue({
      data: {
        project: {
          id: 'proj-new',
          title: 'New Project',
          outcome: 'Test outcome',
          status: 'active',
          has_next_action: false,
          task_count: 0,
          next_action_count: 0,
          tasks: [],
        },
      },
    });
    projectsAPI.update.mockResolvedValue({
      data: { project: { ...mockActiveProject, title: 'Updated Title' } },
    });
    projectsAPI.delete.mockResolvedValue({ data: { message: 'Project deleted' } });
    projectsAPI.complete.mockResolvedValue({
      data: { project: { ...mockActiveProject, status: 'completed' } },
    });
    projectsAPI.hold.mockResolvedValue({
      data: { project: { ...mockActiveProject, status: 'on_hold' } },
    });
    projectsAPI.activate.mockResolvedValue({
      data: { project: { ...mockOnHoldProject, status: 'active' } },
    });
  });

  describe('Projects List Page', () => {
    it('displays projects list with project details', async () => {
      renderWithProviders(<ProjectsPage />, { route: '/projects' });

      await waitFor(() => {
        expect(screen.getByText('Build new website')).toBeInTheDocument();
        expect(screen.getByText('Q4 Marketing Campaign')).toBeInTheDocument();
        expect(screen.getByText('Office Renovation')).toBeInTheDocument();
        expect(screen.getByText('Employee Handbook')).toBeInTheDocument();
      });

      // Check project count badge
      expect(screen.getByText('4 projects')).toBeInTheDocument();
    });

    it('shows project status badges correctly', async () => {
      renderWithProviders(<ProjectsPage />, { route: '/projects' });

      // Wait for all projects to be rendered first
      await waitFor(() => {
        expect(screen.getByText('Build new website')).toBeInTheDocument();
        expect(screen.getByText('Office Renovation')).toBeInTheDocument();
        expect(screen.getByText('Employee Handbook')).toBeInTheDocument();
      });

      // Get the project cards container
      const projectList = screen.getByText('Build new website').closest('.bg-white');

      // Then check for status badges within the project list
      // Active status appears multiple times for active projects
      expect(within(projectList).getAllByText('Active').length).toBeGreaterThanOrEqual(1);
      expect(within(projectList).getByText('On Hold')).toBeInTheDocument();
      expect(within(projectList).getByText('Completed')).toBeInTheDocument();
    });

    it('highlights projects needing attention', async () => {
      renderWithProviders(<ProjectsPage />, { route: '/projects' });

      await waitFor(() => {
        expect(screen.getByText('Q4 Marketing Campaign')).toBeInTheDocument();
        // Needs attention badge should appear
        expect(screen.getByText('Needs attention')).toBeInTheDocument();
      });
    });

    it('filters projects by status', async () => {
      const { user } = renderWithProviders(<ProjectsPage />, { route: '/projects' });

      await waitFor(() => {
        expect(screen.getByText('Build new website')).toBeInTheDocument();
      });

      // Select "On Hold" filter
      const filterSelect = screen.getByRole('combobox', { name: /filter by status/i });
      await user.selectOptions(filterSelect, 'on_hold');

      await waitFor(() => {
        // Should show only on-hold project
        expect(screen.getByText('Office Renovation')).toBeInTheDocument();
        // Others should be hidden
        expect(screen.queryByText('Build new website')).not.toBeInTheDocument();
        expect(screen.queryByText('Q4 Marketing Campaign')).not.toBeInTheDocument();
        expect(screen.queryByText('Employee Handbook')).not.toBeInTheDocument();
      });
    });

    it('shows empty state when no projects', async () => {
      projectsAPI.getAll.mockResolvedValue({ data: { projects: [], count: 0 } });
      const emptyStore = createTestStore({
        projects: {
          projects: [],
          currentProject: null,
          loading: false,
          error: null,
        },
      });

      renderWithProviders(<ProjectsPage />, { store: emptyStore, route: '/projects' });

      await waitFor(() => {
        expect(screen.getByText(/no projects yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Project Creation', () => {
    it('creates a new project', async () => {
      const { user } = renderWithProviders(<ProjectsPage />, { route: '/projects' });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new project/i })).toBeInTheDocument();
      });

      // Click "New Project" button
      await user.click(screen.getByRole('button', { name: /new project/i }));

      // Modal should open
      await waitFor(() => {
        expect(screen.getByText('Create New Project')).toBeInTheDocument();
      });

      // Fill in the form
      const titleInput = screen.getByLabelText(/title/i);
      const outcomeInput = screen.getByLabelText(/outcome/i);

      await user.type(titleInput, 'New Project');
      await user.type(outcomeInput, 'Test outcome');

      // Submit the form
      await user.click(screen.getByRole('button', { name: /create/i }));

      await waitFor(() => {
        expect(projectsAPI.create).toHaveBeenCalledWith({
          title: 'New Project',
          outcome: 'Test outcome',
        });
      });
    });

    it('validates required fields on creation', async () => {
      const { user } = renderWithProviders(<ProjectsPage />, { route: '/projects' });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new project/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /new project/i }));

      await waitFor(() => {
        expect(screen.getByText('Create New Project')).toBeInTheDocument();
      });

      // Try to submit without title
      await user.click(screen.getByRole('button', { name: /create/i }));

      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      });

      // API should not be called
      expect(projectsAPI.create).not.toHaveBeenCalled();
    });
  });

  describe('Project Status Transitions', () => {
    it('completes a project from the list', async () => {
      const { user } = renderWithProviders(<ProjectsPage />, { route: '/projects' });

      await waitFor(() => {
        expect(screen.getByText('Build new website')).toBeInTheDocument();
      });

      // Click complete button
      const completeButtons = screen.getAllByRole('button', { name: /complete project/i });
      await user.click(completeButtons[0]);

      await waitFor(() => {
        expect(projectsAPI.complete).toHaveBeenCalledWith('proj-1');
      });
    });

    it('puts a project on hold from the list', async () => {
      const { user } = renderWithProviders(<ProjectsPage />, { route: '/projects' });

      await waitFor(() => {
        expect(screen.getByText('Build new website')).toBeInTheDocument();
      });

      // Click hold button
      const holdButtons = screen.getAllByRole('button', { name: /put.*on hold/i });
      await user.click(holdButtons[0]);

      await waitFor(() => {
        expect(projectsAPI.hold).toHaveBeenCalledWith('proj-1');
      });
    });

    it('activates an on-hold project from the list', async () => {
      const { user } = renderWithProviders(<ProjectsPage />, { route: '/projects' });

      await waitFor(() => {
        expect(screen.getByText('Office Renovation')).toBeInTheDocument();
      });

      // Click activate button
      const activateButton = screen.getByRole('button', { name: /activate project/i });
      await user.click(activateButton);

      await waitFor(() => {
        expect(projectsAPI.activate).toHaveBeenCalledWith('proj-3');
      });
    });
  });

  describe('Project Deletion', () => {
    it('deletes a project with confirmation', async () => {
      const { user } = renderWithProviders(<ProjectsPage />, { route: '/projects' });

      await waitFor(() => {
        expect(screen.getByText('Build new website')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByRole('button', { name: /delete project/i });
      await user.click(deleteButtons[0]);

      // Confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });

      // Confirm deletion
      await user.click(screen.getByRole('button', { name: /confirm/i }));

      await waitFor(() => {
        expect(projectsAPI.delete).toHaveBeenCalledWith('proj-1');
      });
    });

    it('cancels project deletion', async () => {
      const { user } = renderWithProviders(<ProjectsPage />, { route: '/projects' });

      await waitFor(() => {
        expect(screen.getByText('Build new website')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByRole('button', { name: /delete project/i });
      await user.click(deleteButtons[0]);

      // Confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });

      // Cancel deletion
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        // Dialog should close
        expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
      });

      // API should not be called
      expect(projectsAPI.delete).not.toHaveBeenCalled();
    });
  });

  describe('Project Detail Page', () => {
    it('displays project title and outcome', async () => {
      const store = createTestStore({
        projects: {
          projects: allMockProjects,
          currentProject: mockActiveProject,
          loading: false,
          error: null,
        },
      });

      renderWithProviders(
        <Routes>
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
        </Routes>,
        { store, route: '/projects/proj-1' }
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: mockActiveProject.title })).toBeInTheDocument();
        expect(screen.getByText(mockActiveProject.outcome)).toBeInTheDocument();
      });
    });

    it('shows next action prominently', async () => {
      const store = createTestStore({
        projects: {
          projects: allMockProjects,
          currentProject: mockActiveProject,
          loading: false,
          error: null,
        },
      });

      renderWithProviders(
        <Routes>
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
        </Routes>,
        { store, route: '/projects/proj-1' }
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Next Action' })).toBeInTheDocument();
        expect(screen.getAllByText('Design homepage mockup').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('renders task list', async () => {
      const store = createTestStore({
        projects: {
          projects: allMockProjects,
          currentProject: mockActiveProject,
          loading: false,
          error: null,
        },
      });

      renderWithProviders(
        <Routes>
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
        </Routes>,
        { store, route: '/projects/proj-1' }
      );

      await waitFor(() => {
        expect(screen.getAllByText('Design homepage mockup').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Set up hosting')).toBeInTheDocument();
        expect(screen.getByText('Create logo')).toBeInTheDocument();
      });
    });

    it('shows needs attention warning when no next action', async () => {
      const store = createTestStore({
        projects: {
          projects: allMockProjects,
          currentProject: mockProjectNeedsAttention,
          loading: false,
          error: null,
        },
      });

      renderWithProviders(
        <Routes>
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
        </Routes>,
        { store, route: '/projects/proj-2' }
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /needs attention/i })).toBeInTheDocument();
      });
    });

    it('handles project not found', async () => {
      projectsAPI.getById.mockRejectedValue({
        response: { data: { error: 'Project not found' }, status: 404 },
      });

      const store = createTestStore({
        projects: {
          projects: [],
          currentProject: null,
          loading: false,
          error: 'Project not found',
        },
      });

      renderWithProviders(
        <Routes>
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
        </Routes>,
        { store, route: '/projects/non-existent' }
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /project not found/i })).toBeInTheDocument();
      });
    });
  });

  describe('Project Edit Functionality', () => {
    it('shows edit project modal', async () => {
      const store = createTestStore({
        projects: {
          projects: allMockProjects,
          currentProject: mockActiveProject,
          loading: false,
          error: null,
        },
      });

      const { user } = renderWithProviders(
        <Routes>
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
        </Routes>,
        { store, route: '/projects/proj-1' }
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit/i }));

      await waitFor(() => {
        expect(screen.getByText('Edit Project')).toBeInTheDocument();
        expect(screen.getByLabelText(/title/i)).toHaveValue(mockActiveProject.title);
      });
    });

    it('updates project title and outcome', async () => {
      const store = createTestStore({
        projects: {
          projects: allMockProjects,
          currentProject: mockActiveProject,
          loading: false,
          error: null,
        },
      });

      const { user } = renderWithProviders(
        <Routes>
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
        </Routes>,
        { store, route: '/projects/proj-1' }
      );

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
  });

  describe('Navigation Between List and Detail', () => {
    const AppWithRoutes = () => (
      <>
        <Navigation />
        <Routes>
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
        </Routes>
      </>
    );

    it('navigates from list to detail page', async () => {
      const store = createTestStore();
      projectsAPI.getById.mockResolvedValue({ data: { project: mockActiveProject } });

      const { user } = renderWithProviders(<AppWithRoutes />, { store, route: '/projects' });

      await waitFor(() => {
        expect(screen.getByText('Build new website')).toBeInTheDocument();
      });

      // Click on project title to navigate to detail
      const projectLink = screen.getByRole('link', { name: 'Build new website' });
      await user.click(projectLink);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Build new website' })).toBeInTheDocument();
      });
    });

    it('navigates back from detail to list page', async () => {
      const store = createTestStore({
        projects: {
          projects: allMockProjects,
          currentProject: mockActiveProject,
          loading: false,
          error: null,
        },
      });

      const { user } = renderWithProviders(<AppWithRoutes />, { store, route: '/projects/proj-1' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Build new website' })).toBeInTheDocument();
      });

      // Click back link
      const backLink = screen.getByRole('link', { name: /back/i });
      await user.click(backLink);

      await waitFor(() => {
        expect(screen.getByText('4 projects')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API fails on list page', async () => {
      projectsAPI.getAll.mockRejectedValue({
        response: { data: { message: 'Failed to fetch projects' } },
      });

      const store = createTestStore({
        projects: {
          projects: [],
          currentProject: null,
          loading: false,
          error: 'Failed to fetch projects',
        },
      });

      renderWithProviders(<ProjectsPage />, { store, route: '/projects' });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/failed to fetch projects/i)).toBeInTheDocument();
      });
    });
  });
});
