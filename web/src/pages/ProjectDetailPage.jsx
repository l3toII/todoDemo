import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchProjectById,
  updateProject,
  deleteProject,
  completeProject,
  holdProject,
  activateProject,
  selectCurrentProject,
  selectProjectsLoading,
  selectProjectsError,
  clearError,
  clearCurrentProject,
  PROJECT_STATUS,
} from '../features/projects/projectsSlice';
import Spinner from '../components/Spinner';

const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const project = useSelector(selectCurrentProject);
  const isLoading = useSelector(selectProjectsLoading);
  const error = useSelector(selectProjectsError);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', outcome: '' });
  const [formError, setFormError] = useState('');

  // Fetch project on mount and when ID changes
  useEffect(() => {
    if (id) {
      dispatch(fetchProjectById(id));
    }
    return () => {
      dispatch(clearCurrentProject());
    };
  }, [dispatch, id]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleOpenEditModal = () => {
    if (project) {
      setFormData({
        title: project.title || '',
        outcome: project.outcome || '',
      });
      setFormError('');
      setIsEditModalOpen(true);
    }
  };

  const handleCloseModals = () => {
    setIsEditModalOpen(false);
    setIsDeleteDialogOpen(false);
    setFormData({ title: '', outcome: '' });
    setFormError('');
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setFormError('Title is required');
      return false;
    }
    setFormError('');
    return true;
  };

  const handleUpdateProject = async () => {
    if (!validateForm()) return;

    try {
      await dispatch(
        updateProject({
          id: project.id,
          data: {
            title: formData.title.trim(),
            outcome: formData.outcome.trim() || null,
          },
        })
      ).unwrap();
      handleCloseModals();
    } catch (err) {
      setFormError(err.error || 'Failed to update project');
    }
  };

  const handleDeleteProject = async () => {
    try {
      await dispatch(deleteProject(project.id)).unwrap();
      navigate('/projects');
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const handleCompleteProject = async () => {
    try {
      await dispatch(completeProject(project.id)).unwrap();
    } catch (err) {
      console.error('Failed to complete project:', err);
    }
  };

  const handleHoldProject = async () => {
    try {
      await dispatch(holdProject(project.id)).unwrap();
    } catch (err) {
      console.error('Failed to put project on hold:', err);
    }
  };

  const handleActivateProject = async () => {
    try {
      await dispatch(activateProject(project.id)).unwrap();
    } catch (err) {
      console.error('Failed to activate project:', err);
    }
  };

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

  const needsAttention = project?.status === PROJECT_STATUS.ACTIVE && project?.has_next_action === false;
  const nextActionTask = project?.tasks?.find((task) => task.is_next_action);

  // Loading state
  if (isLoading && !project) {
    return (
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center py-12">
          <Spinner size="lg" className="text-blue-500" />
          <span className="ml-2 text-gray-500">Loading project...</span>
        </div>
      </div>
    );
  }

  // Error state / Not found
  if (error || (!isLoading && !project)) {
    return (
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Project not found</h3>
          <p className="mt-1 text-sm text-gray-500">
            The project you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
          <div className="mt-6">
            <Link
              to="/projects"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to projects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Back link */}
      <div className="mb-4">
        <Link
          to="/projects"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to projects
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(project.status)}`}>
                {getStatusLabel(project.status)}
              </span>
            </div>
            {project.outcome && (
              <p className="mt-2 text-gray-600">{project.outcome}</p>
            )}
            <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
              <span>{project.task_count || 0} tasks</span>
              {project.next_action_count > 0 && (
                <span>{project.next_action_count} next actions</span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={handleOpenEditModal}
              className="p-2 text-gray-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
              aria-label="Edit project"
              title="Edit project"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => setIsDeleteDialogOpen(true)}
              className="p-2 text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
              aria-label="Delete project"
              title="Delete project"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Status transition buttons */}
        {project.status !== PROJECT_STATUS.COMPLETED && project.status !== PROJECT_STATUS.CANCELLED && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-3">
            {project.status === PROJECT_STATUS.ACTIVE && (
              <>
                <button
                  onClick={handleCompleteProject}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Complete
                </button>
                <button
                  onClick={handleHoldProject}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Put on Hold
                </button>
              </>
            )}
            {project.status === PROJECT_STATUS.ON_HOLD && (
              <button
                onClick={handleActivateProject}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Activate
              </button>
            )}
          </div>
        )}
      </div>

      {/* Needs Attention Warning */}
      {needsAttention && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex">
            <svg className="h-5 w-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-orange-800">Needs attention</h3>
              <p className="mt-1 text-sm text-orange-700">
                No next action defined. Every active project should have at least one next action to keep progress moving.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Next Action Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Next Action</h2>
        {nextActionTask ? (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-gray-900 font-medium">{nextActionTask.title}</span>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            No next action defined for this project.
          </p>
        )}
      </div>

      {/* Tasks List */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tasks</h2>
        {project.tasks && project.tasks.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {project.tasks.map((task) => (
              <div
                key={task.id}
                data-testid={`task-${task.id}`}
                className={`py-3 flex items-center justify-between ${task.is_next_action ? 'bg-blue-50 -mx-6 px-6' : ''}`}
              >
                <div className="flex items-center">
                  {task.status === 'completed' ? (
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : task.is_next_action ? (
                    <svg className="w-5 h-5 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ) : (
                    <div className="w-5 h-5 border-2 border-gray-300 rounded mr-3" />
                  )}
                  <span className={task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'}>
                    {task.title}
                  </span>
                </div>
                {task.is_next_action && (
                  <span className="text-xs text-blue-600 font-medium">Next Action</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No tasks yet. Add tasks to track progress on this project.</p>
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={handleCloseModals}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6"
            >
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Project</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700">
                      Title
                    </label>
                    <input
                      type="text"
                      id="edit-title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-outcome" className="block text-sm font-medium text-gray-700">
                      Outcome
                    </label>
                    <textarea
                      id="edit-outcome"
                      value={formData.outcome}
                      onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  {formError && (
                    <p className="text-sm text-red-600">{formError}</p>
                  )}
                </div>
                <div className="mt-5 sm:mt-6 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={handleCloseModals}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdateProject}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={handleCloseModals}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6"
            >
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg font-medium text-gray-900">Delete Project</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete <strong>{project.title}</strong>? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={handleCloseModals}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteProject}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetailPage;
