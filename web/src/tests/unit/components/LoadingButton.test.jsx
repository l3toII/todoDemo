import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoadingButton, { Spinner } from '../../../components/LoadingButton';

describe('Spinner', () => {
  it('renders with default className', () => {
    render(<Spinner />);

    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin', 'h-5', 'w-5');
  });

  it('renders with custom className', () => {
    render(<Spinner className="h-8 w-8 text-red-500" />);

    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('animate-spin', 'h-8', 'w-8', 'text-red-500');
  });
});

describe('LoadingButton', () => {
  it('renders children when not loading', () => {
    render(<LoadingButton>Click me</LoadingButton>);

    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('renders loading spinner and text when loading', () => {
    render(
      <LoadingButton isLoading loadingText="Loading...">
        Click me
      </LoadingButton>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveTextContent('Loading...');
    expect(screen.queryByText('Click me')).not.toBeInTheDocument();
  });

  it('renders only spinner when loading without loadingText', () => {
    render(<LoadingButton isLoading>Click me</LoadingButton>);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.queryByText('Click me')).not.toBeInTheDocument();
  });

  it('is disabled when loading', () => {
    render(<LoadingButton isLoading>Click me</LoadingButton>);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled when disabled prop is true', () => {
    render(<LoadingButton disabled>Click me</LoadingButton>);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is not disabled by default', () => {
    render(<LoadingButton>Click me</LoadingButton>);

    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<LoadingButton onClick={handleClick}>Click me</LoadingButton>);

    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <LoadingButton onClick={handleClick} disabled>
        Click me
      </LoadingButton>
    );

    await user.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not call onClick when loading', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <LoadingButton onClick={handleClick} isLoading>
        Click me
      </LoadingButton>
    );

    await user.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  describe('variants', () => {
    it('renders primary variant by default', () => {
      render(<LoadingButton>Click me</LoadingButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-600', 'text-white');
    });

    it('renders secondary variant', () => {
      render(<LoadingButton variant="secondary">Click me</LoadingButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-white', 'text-gray-700', 'border-gray-300');
    });

    it('renders danger variant', () => {
      render(<LoadingButton variant="danger">Click me</LoadingButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-600', 'text-white');
    });
  });

  describe('sizes', () => {
    it('renders medium size by default', () => {
      render(<LoadingButton>Click me</LoadingButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('py-2', 'px-4', 'text-sm');
    });

    it('renders small size', () => {
      render(<LoadingButton size="sm">Click me</LoadingButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('py-1.5', 'px-3', 'text-xs');
    });

    it('renders large size', () => {
      render(<LoadingButton size="lg">Click me</LoadingButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('py-3', 'px-6', 'text-base');
    });
  });

  describe('fullWidth', () => {
    it('is not full width by default', () => {
      render(<LoadingButton>Click me</LoadingButton>);

      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('w-full');
    });

    it('is full width when fullWidth prop is true', () => {
      render(<LoadingButton fullWidth>Click me</LoadingButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-full');
    });
  });

  describe('type', () => {
    it('has type="button" by default', () => {
      render(<LoadingButton>Click me</LoadingButton>);

      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('can have type="submit"', () => {
      render(<LoadingButton type="submit">Submit</LoadingButton>);

      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });

    it('can have type="reset"', () => {
      render(<LoadingButton type="reset">Reset</LoadingButton>);

      expect(screen.getByRole('button')).toHaveAttribute('type', 'reset');
    });
  });

  it('applies additional className', () => {
    render(<LoadingButton className="my-custom-class">Click me</LoadingButton>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('my-custom-class');
  });

  it('passes additional props to button element', () => {
    render(
      <LoadingButton data-testid="my-button" aria-label="Custom label">
        Click me
      </LoadingButton>
    );

    const button = screen.getByTestId('my-button');
    expect(button).toHaveAttribute('aria-label', 'Custom label');
  });
});
