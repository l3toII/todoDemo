import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TimezoneSelector from '../../../components/TimezoneSelector';

describe('TimezoneSelector', () => {
  const defaultProps = {
    value: 'UTC',
    onChange: vi.fn(),
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with label', () => {
    render(<TimezoneSelector {...defaultProps} />);
    expect(screen.getByLabelText(/timezone/i)).toBeInTheDocument();
  });

  it('displays the selected timezone', () => {
    render(<TimezoneSelector {...defaultProps} value="Europe/Paris" />);
    const select = screen.getByRole('combobox');
    expect(select.value).toBe('Europe/Paris');
  });

  it('calls onChange when a timezone is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TimezoneSelector {...defaultProps} onChange={onChange} />);

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'America/New_York');

    expect(onChange).toHaveBeenCalledWith('America/New_York');
  });

  it('renders timezone groups', () => {
    render(<TimezoneSelector {...defaultProps} />);

    // Check for optgroup labels
    expect(screen.getByRole('group', { name: 'America' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Europe' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Asia' })).toBeInTheDocument();
  });

  it('disables select when disabled prop is true', () => {
    render(<TimezoneSelector {...defaultProps} disabled={true} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });

  it('displays error message when error prop is provided', () => {
    render(<TimezoneSelector {...defaultProps} error="Invalid timezone" />);
    expect(screen.getByText('Invalid timezone')).toBeInTheDocument();
  });

  it('displays helper text', () => {
    render(<TimezoneSelector {...defaultProps} />);
    expect(screen.getByText(/used for displaying dates/i)).toBeInTheDocument();
  });

  it('applies error styling when error is present', () => {
    render(<TimezoneSelector {...defaultProps} error="Error" />);
    const select = screen.getByRole('combobox');
    expect(select.className).toContain('border-red-300');
  });
});
