import PropTypes from 'prop-types';

/**
 * Shared due date badge component.
 * Displays a date with calendar icon in purple styling.
 */
const DueDateBadge = ({ date }) => {
  if (!date) return null;

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      {new Date(date).toLocaleDateString()}
    </span>
  );
};

DueDateBadge.propTypes = {
  date: PropTypes.string,
};

export default DueDateBadge;
