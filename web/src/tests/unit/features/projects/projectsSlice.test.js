import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import projectsReducer, {
  fetchProjects,
  fetchProjectById,
  createProject,
  updateProject,
  deleteProject,
  completeProject,
  holdProject,
  activateProject,
  clearError,
  selectAllProjects,
  selectActiveProjects,
  selectProjectsNeedingAttention,
  selectProjectById,
  selectProjectsLoading,
  selectProjectsError,
  selectCurrentProject,
  PROJECT_STATUS,
} from '../../../../features/projects/projectsSlice';
import { projectsAPI } from '../../../../services/api';

// Mock the API
vi.mock('../../../../services/api', () => ({
  projectsAPI: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    complete: vi.fn(),
    hold: vi.fn(),
    activate: vi.fn(),
    getNeedingAttention: vi.fn(),
  },
}));

describe('projectsSlice', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: { projects: projectsReducer },
    });
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().projects;
      expect(state.projects).toEqual([]);
      expect(state.currentProject).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('fetchProjects', () => {
    const mockProjects = [
      {
        id: '1',
        title: 'Project 1',
        outcome: 'Complete feature X',
        status: 'active',
        has_next_action: true,
        task_count: 5,
        next_action_count: 2,
      },
      {
        id: '2',
        title: 'Project 2',
        outcome: 'Improve performance',
        status: 'active',
        has_next_action: false,
        task_count: 3,
        next_action_count: 0,
      },
      {
        id: '3',
        title: 'Completed Project',
        outcome: 'Done',
        status: 'completed',
        has_next_action: false,
        task_count: 2,
        next_action_count: 0,
      },
    ];

    it('should set loading to true when pending', async () => {
      projectsAPI.getAll.mockImplementation(() => new Promise(() => {}));
      store.dispatch(fetchProjects());
      expect(store.getState().projects.loading).toBe(true);
      expect(store.getState().projects.error).toBeNull();
    });

    it('should update projects when fulfilled', async () => {
      projectsAPI.getAll.mockResolvedValue({ data: { projects: mockProjects, count: 3 } });
      await store.dispatch(fetchProjects());

      const state = store.getState().projects;
      expect(state.loading).toBe(false);
      expect(state.projects).toEqual(mockProjects);
      expect(state.error).toBeNull();
    });

    it('should filter projects by status when provided', async () => {
      const activeProjects = mockProjects.filter((p) => p.status === 'active');
      projectsAPI.getAll.mockResolvedValue({ data: { projects: activeProjects, count: 2 } });

      await store.dispatch(fetchProjects({ status: 'active' }));

      const state = store.getState().projects;
      expect(state.projects).toEqual(activeProjects);
      expect(projectsAPI.getAll).toHaveBeenCalledWith({ status: 'active' });
    });

    it('should set error when rejected', async () => {
      const errorMessage = 'Failed to fetch projects';
      projectsAPI.getAll.mockRejectedValue({
        response: { data: { error: errorMessage } },
      });

      await store.dispatch(fetchProjects());

      const state = store.getState().projects;
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });

    it('should handle network error gracefully', async () => {
      projectsAPI.getAll.mockRejectedValue(new Error('Network error'));

      await store.dispatch(fetchProjects());

      const state = store.getState().projects;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Failed to fetch projects');
    });
  });

  describe('fetchProjectById', () => {
    const mockProject = {
      id: '1',
      title: 'Project 1',
      outcome: 'Complete feature X',
      status: 'active',
      has_next_action: true,
      task_count: 5,
      next_action_count: 2,
      tasks: [
        { id: 't1', title: 'Task 1', status: 'next_action' },
        { id: 't2', title: 'Task 2', status: 'inbox' },
      ],
      next_action: { id: 't1', title: 'Task 1', status: 'next_action' },
    };

    it('should set loading to true when pending', async () => {
      projectsAPI.getById.mockImplementation(() => new Promise(() => {}));
      store.dispatch(fetchProjectById('1'));
      expect(store.getState().projects.loading).toBe(true);
    });

    it('should set currentProject when fulfilled', async () => {
      projectsAPI.getById.mockResolvedValue({ data: { project: mockProject } });
      await store.dispatch(fetchProjectById('1'));

      const state = store.getState().projects;
      expect(state.loading).toBe(false);
      expect(state.currentProject).toEqual(mockProject);
      expect(state.error).toBeNull();
    });

    it('should set error when project not found', async () => {
      projectsAPI.getById.mockRejectedValue({
        response: { data: { error: 'Project not found', code: 'NOT_FOUND' }, status: 404 },
      });

      await store.dispatch(fetchProjectById('invalid-id'));

      const state = store.getState().projects;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Project not found');
      expect(state.currentProject).toBeNull();
    });
  });

  describe('createProject', () => {
    const newProject = {
      title: 'New Project',
      outcome: 'Achieve something great',
    };

    const createdProject = {
      id: 'new-id',
      title: 'New Project',
      outcome: 'Achieve something great',
      status: 'active',
      has_next_action: false,
      task_count: 0,
      next_action_count: 0,
    };

    it('should set loading to true when pending', async () => {
      projectsAPI.create.mockImplementation(() => new Promise(() => {}));
      store.dispatch(createProject(newProject));
      expect(store.getState().projects.loading).toBe(true);
    });

    it('should add new project when fulfilled', async () => {
      projectsAPI.create.mockResolvedValue({
        data: { project: createdProject, message: 'Project created successfully' },
      });

      await store.dispatch(createProject(newProject));

      const state = store.getState().projects;
      expect(state.loading).toBe(false);
      expect(state.projects).toContainEqual(createdProject);
      expect(state.error).toBeNull();
    });

    it('should set error when creation fails', async () => {
      projectsAPI.create.mockRejectedValue({
        response: { data: { error: 'Title is required', code: 'MISSING_TITLE' } },
      });

      await store.dispatch(createProject({ outcome: 'No title' }));

      const state = store.getState().projects;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Title is required');
    });
  });

  describe('updateProject', () => {
    const existingProjects = [
      { id: '1', title: 'Project 1', status: 'active', outcome: 'Old outcome' },
      { id: '2', title: 'Project 2', status: 'active', outcome: null },
    ];

    const updatedProject = {
      id: '1',
      title: 'Updated Project',
      status: 'active',
      outcome: 'New outcome',
    };

    beforeEach(async () => {
      projectsAPI.getAll.mockResolvedValue({ data: { projects: existingProjects } });
      await store.dispatch(fetchProjects());
    });

    it('should update project in state when fulfilled', async () => {
      projectsAPI.update.mockResolvedValue({
        data: { project: updatedProject, message: 'Project updated successfully' },
      });

      await store.dispatch(updateProject({ id: '1', data: { title: 'Updated Project', outcome: 'New outcome' } }));

      const state = store.getState().projects;
      const updated = state.projects.find((p) => p.id === '1');
      expect(updated.title).toBe('Updated Project');
      expect(updated.outcome).toBe('New outcome');
    });

    it('should set error when update fails', async () => {
      projectsAPI.update.mockRejectedValue({
        response: { data: { error: 'Title cannot be empty', code: 'INVALID_TITLE' } },
      });

      await store.dispatch(updateProject({ id: '1', data: { title: '' } }));

      const state = store.getState().projects;
      expect(state.error).toBe('Title cannot be empty');
    });
  });

  describe('deleteProject', () => {
    const existingProjects = [
      { id: '1', title: 'Project 1', status: 'active' },
      { id: '2', title: 'Project 2', status: 'active' },
    ];

    beforeEach(async () => {
      projectsAPI.getAll.mockResolvedValue({ data: { projects: existingProjects } });
      await store.dispatch(fetchProjects());
    });

    it('should remove project from state when fulfilled', async () => {
      projectsAPI.delete.mockResolvedValue({ data: { message: 'Project deleted successfully' } });

      await store.dispatch(deleteProject('2'));

      const state = store.getState().projects;
      expect(state.projects).not.toContainEqual(expect.objectContaining({ id: '2' }));
      expect(state.projects).toHaveLength(1);
    });

    it('should set error when delete fails', async () => {
      projectsAPI.delete.mockRejectedValue({
        response: { data: { error: 'Cannot delete project with active tasks', code: 'HAS_ACTIVE_TASKS' } },
      });

      await store.dispatch(deleteProject('1'));

      const state = store.getState().projects;
      expect(state.error).toBe('Cannot delete project with active tasks');
      expect(state.projects).toHaveLength(2);
    });
  });

  describe('completeProject', () => {
    const existingProjects = [
      { id: '1', title: 'Project 1', status: 'active' },
    ];

    const completedProject = {
      id: '1',
      title: 'Project 1',
      status: 'completed',
      completed_at: '2025-12-03T10:00:00Z',
    };

    beforeEach(async () => {
      projectsAPI.getAll.mockResolvedValue({ data: { projects: existingProjects } });
      await store.dispatch(fetchProjects());
    });

    it('should update project status to completed when fulfilled', async () => {
      projectsAPI.complete.mockResolvedValue({
        data: { project: completedProject, message: 'Project completed' },
      });

      await store.dispatch(completeProject('1'));

      const state = store.getState().projects;
      const project = state.projects.find((p) => p.id === '1');
      expect(project.status).toBe('completed');
    });

    it('should set error when complete fails', async () => {
      projectsAPI.complete.mockRejectedValue({
        response: { data: { error: 'Invalid status transition', code: 'INVALID_TRANSITION' } },
      });

      await store.dispatch(completeProject('1'));

      const state = store.getState().projects;
      expect(state.error).toBe('Invalid status transition');
    });
  });

  describe('holdProject', () => {
    const existingProjects = [
      { id: '1', title: 'Project 1', status: 'active' },
    ];

    const heldProject = {
      id: '1',
      title: 'Project 1',
      status: 'on_hold',
    };

    beforeEach(async () => {
      projectsAPI.getAll.mockResolvedValue({ data: { projects: existingProjects } });
      await store.dispatch(fetchProjects());
    });

    it('should update project status to on_hold when fulfilled', async () => {
      projectsAPI.hold.mockResolvedValue({
        data: { project: heldProject, message: 'Project put on hold' },
      });

      await store.dispatch(holdProject('1'));

      const state = store.getState().projects;
      const project = state.projects.find((p) => p.id === '1');
      expect(project.status).toBe('on_hold');
    });
  });

  describe('activateProject', () => {
    const existingProjects = [
      { id: '1', title: 'Project 1', status: 'on_hold' },
    ];

    const activatedProject = {
      id: '1',
      title: 'Project 1',
      status: 'active',
    };

    beforeEach(async () => {
      projectsAPI.getAll.mockResolvedValue({ data: { projects: existingProjects } });
      await store.dispatch(fetchProjects());
    });

    it('should update project status to active when fulfilled', async () => {
      projectsAPI.activate.mockResolvedValue({
        data: { project: activatedProject, message: 'Project activated' },
      });

      await store.dispatch(activateProject('1'));

      const state = store.getState().projects;
      const project = state.projects.find((p) => p.id === '1');
      expect(project.status).toBe('active');
    });
  });

  describe('clearError reducer', () => {
    it('should clear the error state', async () => {
      projectsAPI.getAll.mockRejectedValue({
        response: { data: { error: 'Some error' } },
      });
      await store.dispatch(fetchProjects());
      expect(store.getState().projects.error).toBe('Some error');

      store.dispatch(clearError());
      expect(store.getState().projects.error).toBeNull();
    });
  });

  describe('selectors', () => {
    const mockState = {
      projects: {
        projects: [
          { id: '1', title: 'Active 1', status: 'active', has_next_action: true },
          { id: '2', title: 'Active 2', status: 'active', has_next_action: false },
          { id: '3', title: 'On Hold', status: 'on_hold', has_next_action: false },
          { id: '4', title: 'Completed', status: 'completed', has_next_action: false },
        ],
        currentProject: { id: '1', title: 'Active 1', status: 'active' },
        loading: false,
        error: null,
      },
    };

    it('selectAllProjects returns all projects', () => {
      const result = selectAllProjects(mockState);
      expect(result).toHaveLength(4);
    });

    it('selectActiveProjects returns only active projects', () => {
      const result = selectActiveProjects(mockState);
      expect(result).toHaveLength(2);
      expect(result.every((p) => p.status === 'active')).toBe(true);
    });

    it('selectProjectsNeedingAttention returns active projects without next action', () => {
      const result = selectProjectsNeedingAttention(mockState);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
      expect(result[0].has_next_action).toBe(false);
    });

    it('selectProjectById returns project by id', () => {
      const result = selectProjectById(mockState, '2');
      expect(result.title).toBe('Active 2');
    });

    it('selectProjectById returns undefined for non-existent id', () => {
      const result = selectProjectById(mockState, 'non-existent');
      expect(result).toBeUndefined();
    });

    it('selectProjectsLoading returns loading state', () => {
      expect(selectProjectsLoading({ projects: { loading: true } })).toBe(true);
      expect(selectProjectsLoading({ projects: { loading: false } })).toBe(false);
    });

    it('selectProjectsError returns error state', () => {
      expect(selectProjectsError({ projects: { error: 'Error!' } })).toBe('Error!');
      expect(selectProjectsError({ projects: { error: null } })).toBeNull();
    });

    it('selectCurrentProject returns currentProject state', () => {
      expect(selectCurrentProject(mockState)).toEqual({ id: '1', title: 'Active 1', status: 'active' });
    });
  });

  describe('PROJECT_STATUS constants', () => {
    it('should export correct status constants', () => {
      expect(PROJECT_STATUS.ACTIVE).toBe('active');
      expect(PROJECT_STATUS.ON_HOLD).toBe('on_hold');
      expect(PROJECT_STATUS.COMPLETED).toBe('completed');
      expect(PROJECT_STATUS.CANCELLED).toBe('cancelled');
    });
  });
});
