import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import TwoMinuteTimer from '../../../components/TwoMinuteTimer';

describe('TwoMinuteTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with initial state', () => {
    render(<TwoMinuteTimer />);

    expect(screen.getByText('2:00')).toBeInTheDocument();
    expect(screen.getByText(/2-minute rule timer/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });

  it('starts timer when start button is clicked', () => {
    render(<TwoMinuteTimer />);

    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });

  it('counts down when running', () => {
    render(<TwoMinuteTimer />);

    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('1:59')).toBeInTheDocument();
  });

  it('pauses timer when pause button is clicked', () => {
    render(<TwoMinuteTimer />);

    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    fireEvent.click(screen.getByRole('button', { name: /pause/i }));

    expect(screen.getByText('1:55')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();

    // Time should not advance when paused
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('1:55')).toBeInTheDocument();
  });

  it('resets timer when reset button is clicked', () => {
    render(<TwoMinuteTimer />);

    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    fireEvent.click(screen.getByRole('button', { name: /reset/i }));

    expect(screen.getByText('2:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });

  it('calls onComplete when done button is clicked', () => {
    const onComplete = vi.fn();
    render(<TwoMinuteTimer onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: /done/i }));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when takes longer button is clicked', () => {
    const onCancel = vi.fn();
    render(<TwoMinuteTimer onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: /takes longer/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('auto-starts when autoStart prop is true', () => {
    render(<TwoMinuteTimer autoStart={true} />);

    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });

  it('changes color as time decreases', () => {
    render(<TwoMinuteTimer />);

    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    // Initial: green (more than 60 seconds)
    expect(screen.getByText('2:00')).toHaveClass('text-green-600');

    // Advance to under 60 seconds
    act(() => {
      vi.advanceTimersByTime(61000);
    });

    expect(screen.getByText('0:59')).toHaveClass('text-yellow-600');

    // Advance to under 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(screen.getByText('0:29')).toHaveClass('text-red-600');
  });

  it('shows completion message when timer reaches zero', () => {
    render(<TwoMinuteTimer />);

    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    act(() => {
      vi.advanceTimersByTime(120000);
    });

    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(screen.getByText(/time is up/i)).toBeInTheDocument();
  });
});
