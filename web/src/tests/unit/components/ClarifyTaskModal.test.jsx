import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClarifyTaskModal from '../../../components/ClarifyTaskModal';

describe('ClarifyTaskModal', () => {
  const mockTask = {
    id: '123',
    title: 'Test Task',
    notes: 'Test notes',
    status: 'inbox',
  };

  const defaultProps = {
    task: mockTask,
    onClarify: vi.fn(),
    onClose: vi.fn(),
    onConvertToProject: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with initial actionable question', () => {
    render(<ClarifyTaskModal {...defaultProps} />);

    expect(screen.getByText(/is this actionable/i)).toBeInTheDocument();
    expect(screen.getByText(/yes, it's actionable/i)).toBeInTheDocument();
    expect(screen.getByText(/no, it's not/i)).toBeInTheDocument();
  });

  it('displays task title in header', () => {
    render(<ClarifyTaskModal {...defaultProps} />);

    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<ClarifyTaskModal {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('shows two-minute question when actionable is selected', () => {
    render(<ClarifyTaskModal {...defaultProps} />);

    fireEvent.click(screen.getByText(/yes, it's actionable/i));

    expect(screen.getByText(/can it be done in 2 minutes or less/i)).toBeInTheDocument();
  });

  it('shows non-actionable options when not actionable', () => {
    render(<ClarifyTaskModal {...defaultProps} />);

    fireEvent.click(screen.getByText(/no, it's not/i));

    expect(screen.getByText(/what is it/i)).toBeInTheDocument();
    expect(screen.getByText(/trash it/i)).toBeInTheDocument();
    expect(screen.getByText(/reference material/i)).toBeInTheDocument();
    expect(screen.getByText(/someday\/maybe/i)).toBeInTheDocument();
  });

  it('shows timer when 2-minute task is selected', () => {
    render(<ClarifyTaskModal {...defaultProps} />);

    fireEvent.click(screen.getByText(/yes, it's actionable/i));
    fireEvent.click(screen.getByText(/yes, do it now/i));

    expect(screen.getByText(/do it now!/i)).toBeInTheDocument();
    expect(screen.getByText('2:00')).toBeInTheDocument();
  });

  it('shows single/project question when task takes longer', () => {
    render(<ClarifyTaskModal {...defaultProps} />);

    fireEvent.click(screen.getByText(/yes, it's actionable/i));
    fireEvent.click(screen.getByText(/no, it takes longer/i));

    expect(screen.getByText(/single action or project/i)).toBeInTheDocument();
  });

  it('shows delegate/defer options for single action', () => {
    render(<ClarifyTaskModal {...defaultProps} />);

    fireEvent.click(screen.getByText(/yes, it's actionable/i));
    fireEvent.click(screen.getByText(/no, it takes longer/i));
    fireEvent.click(screen.getByText(/single action/i));

    expect(screen.getByText(/what's the next step/i)).toBeInTheDocument();
    expect(screen.getByText(/do it myself/i)).toBeInTheDocument();
    expect(screen.getByText(/delegate it/i)).toBeInTheDocument();
    expect(screen.getByText(/maybe later/i)).toBeInTheDocument();
  });

  it('shows details form after selecting next action', async () => {
    render(<ClarifyTaskModal {...defaultProps} />);

    fireEvent.click(screen.getByText(/yes, it's actionable/i));
    fireEvent.click(screen.getByText(/no, it takes longer/i));
    fireEvent.click(screen.getByText(/single action/i));
    fireEvent.click(screen.getByText(/do it myself/i));

    await waitFor(() => {
      expect(screen.getByText(/task details/i)).toBeInTheDocument();
      expect(screen.getByText(/energy level/i)).toBeInTheDocument();
      expect(screen.getByText(/time estimate/i)).toBeInTheDocument();
    });
  });

  it('shows project form when project is selected', () => {
    render(<ClarifyTaskModal {...defaultProps} />);

    fireEvent.click(screen.getByText(/yes, it's actionable/i));
    fireEvent.click(screen.getByText(/no, it takes longer/i));
    fireEvent.click(screen.getByText(/project/i));

    expect(screen.getByText(/project details/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/what's the desired outcome/i)).toBeInTheDocument();
  });

  it('calls onClarify when trash is selected', () => {
    render(<ClarifyTaskModal {...defaultProps} />);

    fireEvent.click(screen.getByText(/no, it's not/i));
    fireEvent.click(screen.getByText(/trash it/i));

    expect(defaultProps.onClarify).toHaveBeenCalledWith('123', { status: 'deleted' });
  });

  it('disables save button when loading', async () => {
    render(<ClarifyTaskModal {...defaultProps} isLoading={true} />);

    fireEvent.click(screen.getByText(/yes, it's actionable/i));
    fireEvent.click(screen.getByText(/no, it takes longer/i));
    fireEvent.click(screen.getByText(/single action/i));
    fireEvent.click(screen.getByText(/do it myself/i));

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /saving/i });
      expect(saveButton).toBeDisabled();
    });
  });

  it('shows progress indicator', () => {
    render(<ClarifyTaskModal {...defaultProps} />);

    // Should show step dots
    const progressDots = document.querySelectorAll('.rounded-full.w-2.h-2');
    expect(progressDots.length).toBeGreaterThan(0);
  });
});
