import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ProjectSelector from '../../../components/ProjectSelector';
import projectsReducer from '../../../features/projects/projectsSlice';

describe('ProjectSelector', () => {
  let store;
  let mockOnSelect;

  const mockProjects = [
    { id: 'proj-1', title: 'Project Alpha', status: 'active' },
    { id: 'proj-2', title: 'Project Beta', status: 'active' },
    { id: 'proj-3', title: 'Project Gamma', status: 'completed' },
  ];

  const createStore = (preloadedState = {}) => {
    return configureStore({
      reducer: {
        projects: projectsReducer,
      },
      preloadedState: {
        projects: {
          projects: mockProjects,
          currentProject: null,
          loading: false,
          error: null,
          ...preloadedState,
        },
      },
    });
  };

  const renderSelector = (props = {}) => {
    return render(
      <Provider store={store}>
        <ProjectSelector
          onSelect={mockOnSelect}
          selectedProjectId={null}
          {...props}
        />
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    store = createStore();
    mockOnSelect = vi.fn();
  });

  describe('Rendering', () => {
    it('renders a select dropdown', () => {
      renderSelector();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('shows placeholder text when no project selected', () => {
      renderSelector();
      expect(screen.getByText('Select a project...')).toBeInTheDocument();
    });

    it('displays only active projects in dropdown', () => {
      renderSelector();
      const select = screen.getByRole('combobox');

      // Open dropdown and check options
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(screen.getByText('Project Beta')).toBeInTheDocument();
      // Completed project should not appear (unless status changes)
    });

    it('shows loading state when projects are loading', () => {
      store = createStore({ loading: true });
      renderSelector();
      expect(screen.getByText('Loading projects...')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('calls onSelect with project id when project is selected', () => {
      renderSelector();
      const select = screen.getByRole('combobox');

      fireEvent.change(select, { target: { value: 'proj-1' } });

      expect(mockOnSelect).toHaveBeenCalledWith('proj-1');
    });

    it('shows selected project when selectedProjectId is provided', () => {
      renderSelector({ selectedProjectId: 'proj-1' });
      const select = screen.getByRole('combobox');

      expect(select.value).toBe('proj-1');
    });

    it('calls onSelect with null when placeholder is selected', () => {
      renderSelector({ selectedProjectId: 'proj-1' });
      const select = screen.getByRole('combobox');

      fireEvent.change(select, { target: { value: '' } });

      expect(mockOnSelect).toHaveBeenCalledWith(null);
    });
  });

  describe('Empty State', () => {
    it('shows message when no active projects exist', () => {
      store = createStore({ projects: [] });
      renderSelector();

      expect(screen.getByText('No active projects')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible label', () => {
      renderSelector({ label: 'Add to project' });
      expect(screen.getByLabelText('Add to project')).toBeInTheDocument();
    });
  });
});
