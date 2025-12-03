import PropTypes from 'prop-types';
import Spinner from './Spinner';

/**
 * Reusable loading state component.
 */
const LoadingState = ({ message, color = 'blue' }) => {
  const colorClasses = {
    blue: 'text-blue-500',
    orange: 'text-orange-500',
    purple: 'text-purple-500',
    gray: 'text-gray-500',
  };

  return (
    <div className="flex justify-center items-center py-12">
      <Spinner size="lg" className={colorClasses[color]} />
      <span className="ml-2 text-gray-500">{message}</span>
    </div>
  );
};

LoadingState.propTypes = {
  message: PropTypes.string.isRequired,
  color: PropTypes.oneOf(['blue', 'orange', 'purple', 'gray']),
};

export default LoadingState;
