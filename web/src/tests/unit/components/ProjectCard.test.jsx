import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ProjectCard from '../../../components/ProjectCard';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ProjectCard', () => {
  const mockProject = {
    id: 'proj-1',
    title: 'Test Project',
    outcome: 'Achieve something great',
    status: 'active',
    has_next_action: true,
    task_count: 5,
    next_action_count: 2,
  };

  const mockProjectNoNextAction = {
    id: 'proj-2',
    title: 'Project Needs Attention',
    outcome: 'Need to define next action',
    status: 'active',
    has_next_action: false,
    task_count: 2,
    next_action_count: 0,
  };

  const mockCompletedProject = {
    id: 'proj-3',
    title: 'Completed Project',
    outcome: 'We did it!',
    status: 'completed',
    has_next_action: false,
    task_count: 3,
    next_action_count: 0,
  };

  const mockOnHoldProject = {
    id: 'proj-4',
    title: 'On Hold Project',
    outcome: 'Waiting for something',
    status: 'on_hold',
    has_next_action: false,
    task_count: 1,
    next_action_count: 0,
  };

  const defaultHandlers = {
    onComplete: vi.fn(),
    onHold: vi.fn(),
    onActivate: vi.fn(),
    onDelete: vi.fn(),
  };

  const renderCard = (project = mockProject, handlers = defaultHandlers) => {
    return render(
      <MemoryRouter>
        <ProjectCard project={project} {...handlers} />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should display project title', () => {
      renderCard();
      expect(screen.getByText(mockProject.title)).toBeInTheDocument();
    });

    it('should display project title as link to detail page', () => {
      renderCard();
      const link = screen.getByRole('link', { name: mockProject.title });
      expect(link).toHaveAttribute('href', `/projects/${mockProject.id}`);
    });

    it('should display project outcome if provided', () => {
      renderCard();
      expect(screen.getByText(mockProject.outcome)).toBeInTheDocument();
    });

    it('should not display outcome section if not provided', () => {
      const projectWithoutOutcome = { ...mockProject, outcome: null };
      renderCard(projectWithoutOutcome);
      expect(screen.queryByText(mockProject.outcome)).not.toBeInTheDocument();
    });

    it('should show task count', () => {
      renderCard();
      expect(screen.getByText(/5 tasks/i)).toBeInTheDocument();
    });

    it('should show next action count when present', () => {
      renderCard();
      expect(screen.getByText(/2 next actions/i)).toBeInTheDocument();
    });

    it('should not show next action count when zero', () => {
      renderCard(mockProjectNoNextAction);
      expect(screen.queryByText(/next actions/i)).not.toBeInTheDocument();
    });
  });

  describe('status badge', () => {
    it('should show Active status badge for active projects', () => {
      renderCard();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should show On Hold status badge for on-hold projects', () => {
      renderCard(mockOnHoldProject);
      expect(screen.getByText('On Hold')).toBeInTheDocument();
    });

    it('should show Completed status badge for completed projects', () => {
      renderCard(mockCompletedProject);
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });

  describe('needs attention indicator', () => {
    it('should indicate when project needs attention', () => {
      renderCard(mockProjectNoNextAction);
      // Use exact text to avoid matching the project title
      expect(screen.getByText('Needs attention')).toBeInTheDocument();
    });

    it('should not show needs attention for project with next action', () => {
      renderCard();
      expect(screen.queryByText(/needs attention/i)).not.toBeInTheDocument();
    });

    it('should not show needs attention for completed project', () => {
      const completedNoNextAction = { ...mockCompletedProject, has_next_action: false };
      renderCard(completedNoNextAction);
      expect(screen.queryByText(/needs attention/i)).not.toBeInTheDocument();
    });

    it('should highlight card when needs attention', () => {
      const { container } = renderCard(mockProjectNoNextAction);
      const card = container.firstChild;
      expect(card).toHaveClass('bg-yellow-50');
    });
  });

  describe('quick actions menu', () => {
    it('should show complete button for active projects', () => {
      renderCard();
      expect(screen.getByRole('button', { name: /complete/i })).toBeInTheDocument();
    });

    it('should show hold button for active projects', () => {
      renderCard();
      expect(screen.getByRole('button', { name: /hold/i })).toBeInTheDocument();
    });

    it('should show activate button for on-hold projects', () => {
      renderCard(mockOnHoldProject);
      expect(screen.getByRole('button', { name: /activate/i })).toBeInTheDocument();
    });

    it('should show delete button', () => {
      renderCard();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('should not show complete/hold buttons for completed projects', () => {
      renderCard(mockCompletedProject);
      expect(screen.queryByRole('button', { name: /complete/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /hold/i })).not.toBeInTheDocument();
    });
  });

  describe('action handlers', () => {
    it('should call onComplete when complete button is clicked', async () => {
      const user = userEvent.setup();
      renderCard();

      await user.click(screen.getByRole('button', { name: /complete/i }));

      expect(defaultHandlers.onComplete).toHaveBeenCalledWith(mockProject.id);
    });

    it('should call onHold when hold button is clicked', async () => {
      const user = userEvent.setup();
      renderCard();

      await user.click(screen.getByRole('button', { name: /hold/i }));

      expect(defaultHandlers.onHold).toHaveBeenCalledWith(mockProject.id);
    });

    it('should call onActivate when activate button is clicked', async () => {
      const user = userEvent.setup();
      renderCard(mockOnHoldProject);

      await user.click(screen.getByRole('button', { name: /activate/i }));

      expect(defaultHandlers.onActivate).toHaveBeenCalledWith(mockOnHoldProject.id);
    });

    it('should call onDelete when delete button is clicked', async () => {
      const user = userEvent.setup();
      renderCard();

      await user.click(screen.getByRole('button', { name: /delete/i }));

      expect(defaultHandlers.onDelete).toHaveBeenCalledWith(mockProject);
    });
  });

  describe('navigation', () => {
    it('should navigate to project detail on title click', async () => {
      renderCard();
      const link = screen.getByRole('link', { name: mockProject.title });
      expect(link).toHaveAttribute('href', `/projects/${mockProject.id}`);
    });
  });
});
