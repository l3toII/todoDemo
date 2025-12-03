import { Link } from 'react-router-dom';
import { PROJECT_STATUS } from '../features/projects/projectsSlice';

const ProjectCard = ({
  project,
  onComplete,
  onHold,
  onActivate,
  onDelete,
}) => {
  const getStatusBadgeClasses = (status) => {
    switch (status) {
      case PROJECT_STATUS.ACTIVE:
        return 'bg-green-100 text-green-800';
      case PROJECT_STATUS.ON_HOLD:
        return 'bg-yellow-100 text-yellow-800';
      case PROJECT_STATUS.COMPLETED:
        return 'bg-blue-100 text-blue-800';
      case PROJECT_STATUS.CANCELLED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case PROJECT_STATUS.ACTIVE:
        return 'Active';
      case PROJECT_STATUS.ON_HOLD:
        return 'On Hold';
      case PROJECT_STATUS.COMPLETED:
        return 'Completed';
      case PROJECT_STATUS.CANCELLED:
        return 'Cancelled';
      default:
        return status;
    }
  };

  const needsAttention = project.status === PROJECT_STATUS.ACTIVE && project.has_next_action === false;

  return (
    <div
      className={`p-4 ${needsAttention ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              to={`/projects/${project.id}`}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate"
              aria-label={project.title}
            >
              {project.title}
            </Link>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeClasses(project.status)}`}>
              {getStatusLabel(project.status)}
            </span>
            {needsAttention && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                Needs attention
              </span>
            )}
          </div>
          {project.outcome && (
            <p className="mt-1 text-sm text-gray-500 truncate">{project.outcome}</p>
          )}
          <div className="mt-1 flex items-center gap-4 text-xs text-gray-400">
            <span>{project.task_count} tasks</span>
            {project.next_action_count > 0 && (
              <span>{project.next_action_count} next actions</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 ml-4">
          {/* Status transition buttons */}
          {project.status === PROJECT_STATUS.ACTIVE && (
            <>
              <button
                onClick={() => onComplete(project.id)}
                className="p-1.5 text-gray-400 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded"
                aria-label="Complete project"
                title="Complete project"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                onClick={() => onHold(project.id)}
                className="p-1.5 text-gray-400 hover:text-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 rounded"
                aria-label="Put project on hold"
                title="Put on hold"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </>
          )}
          {project.status === PROJECT_STATUS.ON_HOLD && (
            <button
              onClick={() => onActivate(project.id)}
              className="p-1.5 text-gray-400 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded"
              aria-label="Activate project"
              title="Activate project"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
          {/* Delete button */}
          <button
            onClick={() => onDelete(project)}
            className="p-1.5 text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
            aria-label="Delete project"
            title="Delete project"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
