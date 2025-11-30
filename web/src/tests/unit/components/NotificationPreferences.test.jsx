import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationPreferences from '../../../components/NotificationPreferences';

describe('NotificationPreferences', () => {
  const defaultProps = {
    value: {},
    onChange: vi.fn(),
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with label', () => {
    render(<NotificationPreferences {...defaultProps} />);
    expect(screen.getByText(/email notifications/i)).toBeInTheDocument();
  });

  it('renders all notification options', () => {
    render(<NotificationPreferences {...defaultProps} />);

    expect(screen.getByLabelText(/weekly review reminder/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/deadline reminders/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/inbox overflow alert/i)).toBeInTheDocument();
  });

  it('displays descriptions for each option', () => {
    render(<NotificationPreferences {...defaultProps} />);

    expect(screen.getByText(/receive an email reminder for your weekly review/i)).toBeInTheDocument();
    expect(screen.getByText(/get notified about upcoming task deadlines/i)).toBeInTheDocument();
    expect(screen.getByText(/alert when your inbox has too many/i)).toBeInTheDocument();
  });

  it('shows checked state based on value prop', () => {
    render(
      <NotificationPreferences
        {...defaultProps}
        value={{
          email_weekly_review: true,
          email_deadline_reminder: false,
        }}
      />
    );

    expect(screen.getByLabelText(/weekly review reminder/i)).toBeChecked();
    expect(screen.getByLabelText(/deadline reminders/i)).not.toBeChecked();
  });

  it('calls onChange when checkbox is toggled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <NotificationPreferences
        {...defaultProps}
        value={{ email_weekly_review: false }}
        onChange={onChange}
      />
    );

    await user.click(screen.getByLabelText(/weekly review reminder/i));

    expect(onChange).toHaveBeenCalledWith({
      email_weekly_review: true,
    });
  });

  it('toggles off when already checked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <NotificationPreferences
        {...defaultProps}
        value={{ email_weekly_review: true }}
        onChange={onChange}
      />
    );

    await user.click(screen.getByLabelText(/weekly review reminder/i));

    expect(onChange).toHaveBeenCalledWith({
      email_weekly_review: false,
    });
  });

  it('disables all checkboxes when disabled prop is true', () => {
    render(<NotificationPreferences {...defaultProps} disabled={true} />);

    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeDisabled();
    });
  });

  it('preserves other values when toggling one option', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <NotificationPreferences
        {...defaultProps}
        value={{
          email_weekly_review: true,
          email_deadline_reminder: true,
        }}
        onChange={onChange}
      />
    );

    await user.click(screen.getByLabelText(/inbox overflow alert/i));

    expect(onChange).toHaveBeenCalledWith({
      email_weekly_review: true,
      email_deadline_reminder: true,
      email_inbox_overflow: true,
    });
  });
});
