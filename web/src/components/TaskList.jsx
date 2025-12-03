import PropTypes from 'prop-types';

/**
 * Shared task list container component for GTD pages.
 * Wraps task items in a styled card with dividers.
 */
const TaskList = ({ children }) => {
  if (!children || (Array.isArray(children) && children.length === 0)) {
    return null;
  }

  return (
    <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
      {children}
    </div>
  );
};

TaskList.propTypes = {
  children: PropTypes.node,
};

export default TaskList;
