import PropTypes from 'prop-types';

/**
 * Reusable component for displaying task context badges.
 */
const TaskContextBadges = ({ contexts }) => {
  if (!contexts || contexts.length === 0) return null;

  return (
    <>
      {contexts.map((ctx) => (
        <span
          key={ctx.id}
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
        >
          {ctx.name}
        </span>
      ))}
    </>
  );
};

TaskContextBadges.propTypes = {
  contexts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ),
};

export default TaskContextBadges;
