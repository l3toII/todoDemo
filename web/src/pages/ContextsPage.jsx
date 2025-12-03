import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchContexts,
  createContext,
  updateContext,
  deleteContext,
  selectAllContexts,
  selectDefaultContexts,
  selectCustomContexts,
  selectContextsLoading,
  selectContextsError,
  clearError,
} from '../features/contexts/contextsSlice';
import Spinner from '../components/Spinner';

// Preset colors for context color picker
const PRESET_COLORS = [
  '#4A90D9', // Blue
  '#50C878', // Green
  '#FF6B6B', // Red
  '#9B59B6', // Purple
  '#F39C12', // Orange
  '#1ABC9C', // Teal
  '#E91E63', // Pink
  '#607D8B', // Gray Blue
];

const ContextsPage = () => {
  const dispatch = useDispatch();
  const allContexts = useSelector(selectAllContexts);
  const defaultContexts = useSelector(selectDefaultContexts);
  const customContexts = useSelector(selectCustomContexts);
  const isLoading = useSelector(selectContextsLoading);
  const error = useSelector(selectContextsError);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedContext, setSelectedContext] = useState(null);
  const [formData, setFormData] = useState({ name: '', color: PRESET_COLORS[0] });
  const [formError, setFormError] = useState('');

  // Fetch contexts on mount
  useEffect(() => {
    dispatch(fetchContexts());
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

  const handleOpenCreateModal = () => {
    setFormData({ name: '', color: PRESET_COLORS[0] });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (context) => {
    setSelectedContext(context);
    setFormData({ name: context.name, color: context.color || PRESET_COLORS[0] });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteDialog = (context) => {
    setSelectedContext(context);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteDialogOpen(false);
    setSelectedContext(null);
    setFormData({ name: '', color: PRESET_COLORS[0] });
    setFormError('');
  };

  const validateForm = () => {
    if (!formData.name.startsWith('@')) {
      setFormError('Context name must start with @');
      return false;
    }
    if (formData.name.length < 2) {
      setFormError('Context name must be at least 2 characters');
      return false;
    }
    setFormError('');
    return true;
  };

  const handleCreateContext = async () => {
    if (!validateForm()) return;

    try {
      await dispatch(createContext({ name: formData.name, color: formData.color })).unwrap();
      handleCloseModals();
    } catch (err) {
      setFormError(err.error || 'Failed to create context');
    }
  };

  const handleUpdateContext = async () => {
    if (!validateForm()) return;

    try {
      await dispatch(
        updateContext({ id: selectedContext.id, data: { name: formData.name, color: formData.color } })
      ).unwrap();
      handleCloseModals();
    } catch (err) {
      setFormError(err.error || 'Failed to update context');
    }
  };

  const handleDeleteContext = async () => {
    try {
      await dispatch(deleteContext(selectedContext.id)).unwrap();
      handleCloseModals();
    } catch (err) {
      console.error('Failed to delete context:', err);
    }
  };

  const contextCount = allContexts.length;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contexts</h1>
            <p className="mt-1 text-sm text-gray-500">
              Organize your actions by situation
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {contextCount} {contextCount === 1 ? 'context' : 'contexts'}
            </span>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Context
            </button>
          </div>
        </div>
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
      {isLoading && allContexts.length === 0 && (
        <div className="flex justify-center items-center py-12">
          <Spinner size="lg" className="text-blue-500" />
          <span className="ml-2 text-gray-500">Loading contexts...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && allContexts.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No contexts yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create contexts to organize your tasks by situation (e.g., @Office, @Home).
          </p>
        </div>
      )}

      {/* Contexts List */}
      {allContexts.length > 0 && (
        <div className="space-y-6">
          {/* Default Contexts Section */}
          {defaultContexts.length > 0 && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-3">Default Contexts</h2>
              <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
                {defaultContexts.map((context) => (
                  <div key={context.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        data-testid={`context-color-${context.id}`}
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: context.color || '#6B7280' }}
                      />
                      <span className="text-sm font-medium text-gray-900">{context.name}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        Default
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Contexts Section */}
          {customContexts.length > 0 && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-3">Custom Contexts</h2>
              <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
                {customContexts.map((context) => (
                  <div key={context.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        data-testid={`context-color-${context.id}`}
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: context.color || '#6B7280' }}
                      />
                      <span className="text-sm font-medium text-gray-900">{context.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(context)}
                        className="p-1 text-gray-400 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                        aria-label={`Edit "${context.name}"`}
                        title="Edit context"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleOpenDeleteDialog(context)}
                        className="p-1 text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
                        aria-label={`Delete "${context.name}"`}
                        title="Delete context"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || isEditModalOpen) && (
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
                  {isCreateModalOpen ? 'Create New Context' : 'Edit Context'}
                </h3>

                <div className="space-y-4">
                  {/* Name Input */}
                  <div>
                    <label htmlFor="context-name" className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <input
                      type="text"
                      id="context-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="@ContextName"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  {/* Color Picker */}
                  <div>
                    <label htmlFor="context-color" className="block text-sm font-medium text-gray-700">
                      Color
                    </label>
                    <div id="context-color" className="mt-2 flex flex-wrap gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          data-testid={`color-option-${color}`}
                          onClick={() => setFormData({ ...formData, color })}
                          className={`w-8 h-8 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                            formData.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                          }`}
                          style={{ backgroundColor: color }}
                          aria-label={`Select color ${color}`}
                        />
                      ))}
                    </div>
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
                    onClick={isCreateModalOpen ? handleCreateContext : handleUpdateContext}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {isCreateModalOpen ? 'Create' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && selectedContext && (
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
                  <h3 className="text-lg font-medium text-gray-900">Delete Context</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete <strong>{selectedContext.name}</strong>? This action cannot be undone. Any tasks associated with this context will be unlinked.
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
                  onClick={handleDeleteContext}
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

export default ContextsPage;
