import PropTypes from 'prop-types';

/**
 * Spinner component - SVG animated spinner
 */
const Spinner = ({ className = 'h-5 w-5' }) => (
  <svg
    className={`animate-spin ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    data-testid="loading-spinner"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

Spinner.propTypes = {
  className: PropTypes.string,
};

/**
 * LoadingButton component
 *
 * A button that displays a loading spinner when in loading state.
 * Supports different variants (primary, secondary, danger) and sizes.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button content when not loading
 * @param {boolean} props.isLoading - Whether the button is in loading state
 * @param {string} props.loadingText - Text to display while loading
 * @param {string} props.variant - Button variant (primary, secondary, danger)
 * @param {string} props.size - Button size (sm, md, lg)
 * @param {boolean} props.fullWidth - Whether button should take full width
 * @param {string} props.type - Button type (button, submit, reset)
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {string} props.className - Additional CSS classes
 * @param {Function} props.onClick - Click handler
 */
const LoadingButton = ({
  children,
  isLoading = false,
  loadingText,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  type = 'button',
  disabled = false,
  className = '',
  onClick,
  ...rest
}) => {
  const baseClasses = 'inline-flex justify-center items-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors';

  const variantClasses = {
    primary: 'border border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 disabled:bg-gray-400',
    secondary: 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500 disabled:bg-gray-100',
    danger: 'border border-transparent text-white bg-red-600 hover:bg-red-700 focus:ring-red-500 disabled:bg-gray-400',
  };

  const sizeClasses = {
    sm: 'py-1.5 px-3 text-xs',
    md: 'py-2 px-4 text-sm',
    lg: 'py-3 px-6 text-base',
  };

  const spinnerSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = 'disabled:cursor-not-allowed disabled:opacity-50';

  const combinedClassName = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${disabledClass} ${className}`.trim();

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={combinedClassName}
      {...rest}
    >
      {isLoading ? (
        <span className="flex items-center">
          <Spinner className={`${spinnerSizes[size]} ${loadingText ? '-ml-1 mr-2' : ''}`} />
          {loadingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
};

LoadingButton.propTypes = {
  children: PropTypes.node.isRequired,
  isLoading: PropTypes.bool,
  loadingText: PropTypes.string,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  fullWidth: PropTypes.bool,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  disabled: PropTypes.bool,
  className: PropTypes.string,
  onClick: PropTypes.func,
};

export { Spinner };
export default LoadingButton;
