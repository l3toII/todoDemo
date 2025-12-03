import PropTypes from 'prop-types';
import TaskContextBadges from './TaskContextBadges';

/**
 * Shared task list item component for GTD pages.
 * Displays a task with complete button, title, notes, metadata badges, and optional actions.
 */
const TaskListItem = ({
  task,
  onComplete,
  onAction,
  actionLabel,
  actionClassName,
  metadataBadges,
  titleBadge,
}) => {
  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-3">
        {onComplete && (
          <button
            onClick={() => onComplete(task.id)}
            className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            aria-label={`Complete "${task.title}"`}
            title="Complete task"
          >
            <span className="sr-only">Complete</span>
          </button>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 break-words">
              {task.title}
            </p>
            {titleBadge}
          </div>
          {task.notes && (
            <p className="mt-1 text-sm text-gray-500 break-words line-clamp-2">
              {task.notes}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {metadataBadges}
            <TaskContextBadges contexts={task.contexts} />
          </div>
        </div>

        {onAction && (
          <button
            onClick={() => onAction(task.id)}
            className={actionClassName || "flex-shrink-0 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"}
            aria-label={actionLabel}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

TaskListItem.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    notes: PropTypes.string,
    contexts: PropTypes.array,
  }).isRequired,
  onComplete: PropTypes.func,
  onAction: PropTypes.func,
  actionLabel: PropTypes.string,
  actionClassName: PropTypes.string,
  metadataBadges: PropTypes.node,
  titleBadge: PropTypes.node,
};

export default TaskListItem;
