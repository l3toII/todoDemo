import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchProjects,
  createProject,
  deleteProject,
  completeProject,
  holdProject,
  activateProject,
  selectAllProjects,
  selectProjectsLoading,
  selectProjectsError,
  clearError,
} from '../features/projects/projectsSlice';
import Spinner from '../components/Spinner';
import ProjectCard from '../components/ProjectCard';

const ProjectsPage = () => {
  const dispatch = useDispatch();
  const allProjects = useSelector(selectAllProjects);
  const isLoading = useSelector(selectProjectsLoading);
  const error = useSelector(selectProjectsError);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [formData, setFormData] = useState({ title: '', outcome: '' });
  const [formError, setFormError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch projects on mount
  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  // Filter projects by status
  const filteredProjects = statusFilter === 'all'
    ? allProjects
    : allProjects.filter((p) => p.status === statusFilter);

  const projectCount = allProjects.length;

  const handleOpenCreateModal = () => {
    setFormData({ title: '', outcome: '' });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const handleOpenDeleteDialog = (project) => {
    setSelectedProject(project);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseModals = () => {
    setIsCreateModalOpen(false);
    setIsDeleteDialogOpen(false);
    setSelectedProject(null);
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

  const handleCreateProject = async () => {
    if (!validateForm()) return;

    try {
      await dispatch(createProject({
        title: formData.title.trim(),
        outcome: formData.outcome.trim() || null,
      })).unwrap();
      handleCloseModals();
    } catch (err) {
      setFormError(err.error || 'Failed to create project');
    }
  };

  const handleDeleteProject = async () => {
    try {
      await dispatch(deleteProject(selectedProject.id)).unwrap();
      handleCloseModals();
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const handleCompleteProject = async (projectId) => {
    try {
      await dispatch(completeProject(projectId)).unwrap();
    } catch (err) {
      console.error('Failed to complete project:', err);
    }
  };

  const handleHoldProject = async (projectId) => {
    try {
      await dispatch(holdProject(projectId)).unwrap();
    } catch (err) {
      console.error('Failed to put project on hold:', err);
    }
  };

  const handleActivateProject = async (projectId) => {
    try {
      await dispatch(activateProject(projectId)).unwrap();
    } catch (err) {
      console.error('Failed to activate project:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your multi-step outcomes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {projectCount} {projectCount === 1 ? 'project' : 'projects'}
            </span>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </button>
          </div>
        </div>
      </div>

      {/* Status Filter */}
      <div className="mb-4">
        <label htmlFor="status-filter" className="sr-only">
          Filter by status
        </label>
        <select
          id="status-filter"
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        >
          <option value="all">All Projects</option>
          <option value="active">Active</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => dispatch(clearError())}
              className="ml-auto pl-3 text-red-500 hover:text-red-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && allProjects.length === 0 && (
        <div className="flex justify-center items-center py-12">
          <Spinner size="lg" className="text-blue-500" />
          <span className="ml-2 text-gray-500">Loading projects...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && allProjects.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No projects yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create projects to organize multi-step outcomes with tasks.
          </p>
        </div>
      )}

      {/* Projects List */}
      {filteredProjects.length > 0 && (
        <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onComplete={handleCompleteProject}
              onHold={handleHoldProject}
              onActivate={handleActivateProject}
              onDelete={handleOpenDeleteDialog}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={handleCloseModals}
              aria-hidden="true"
            />

            {/* Modal */}
            <div
              role="dialog"
              aria-modal="true"
              className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6"
            >
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Create New Project
                </h3>

                <div className="space-y-4">
                  {/* Title Input */}
                  <div>
                    <label htmlFor="project-title" className="block text-sm font-medium text-gray-700">
                      Title
                    </label>
                    <input
                      type="text"
                      id="project-title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Project title"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  {/* Outcome Input */}
                  <div>
                    <label htmlFor="project-outcome" className="block text-sm font-medium text-gray-700">
                      Outcome
                    </label>
                    <textarea
                      id="project-outcome"
                      value={formData.outcome}
                      onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                      placeholder="What does success look like? (optional)"
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Define what success looks like for this project (FR-019)
                    </p>
                  </div>

                  {/* Form Error */}
                  {formError && (
                    <p className="text-sm text-red-600">{formError}</p>
                  )}
                </div>

                {/* Modal Actions */}
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
                    onClick={handleCreateProject}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && selectedProject && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={handleCloseModals}
              aria-hidden="true"
            />

            {/* Dialog */}
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
                      Are you sure you want to delete <strong>{selectedProject.title}</strong>? This action cannot be undone. All tasks associated with this project will remain but be unlinked.
                    </p>
                  </div>
                </div>
              </div>

              {/* Dialog Actions */}
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

export default ProjectsPage;
