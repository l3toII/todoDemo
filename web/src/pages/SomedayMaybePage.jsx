import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchSomedayMaybe,
  updateTaskStatus,
  deleteTask,
  selectSomedayMaybe,
  selectTasksLoading,
  selectTasksError,
  clearError,
  TASK_STATUS,
} from '../features/tasks/tasksSlice';
import Spinner from '../components/Spinner';

const SomedayMaybePage = () => {
  const dispatch = useDispatch();
  const tasks = useSelector(selectSomedayMaybe);
  const isLoading = useSelector(selectTasksLoading);
  const error = useSelector(selectTasksError);

  // Fetch someday/maybe tasks on mount
  useEffect(() => {
    dispatch(fetchSomedayMaybe());
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

  const handleActivateTask = async (taskId) => {
    try {
      await dispatch(
        updateTaskStatus({ taskId, status: TASK_STATUS.NEXT_ACTION })
      ).unwrap();
      // Refresh the list
      dispatch(fetchSomedayMaybe());
    } catch (err) {
      console.error('Failed to activate task:', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await dispatch(deleteTask(taskId)).unwrap();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleRefresh = () => {
    dispatch(fetchSomedayMaybe());
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Someday/Maybe</h1>
            <p className="mt-1 text-sm text-gray-500">
              Ideas and tasks deferred for later
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {tasks.length}
            </span>
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              aria-label="Refresh"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
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
      {isLoading && tasks.length === 0 && (
        <div className="flex justify-center items-center py-12">
          <Spinner size="lg" className="text-purple-500" />
          <span className="ml-2 text-gray-500">Loading someday/maybe tasks...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && tasks.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Someday/Maybe Items</h3>
          <p className="mt-1 text-sm text-gray-500">
            Your dreams and future ideas will appear here.
          </p>
        </div>
      )}

      {/* Task List */}
      {tasks.length > 0 && (
        <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Delete Button */}
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="mt-0.5 flex-shrink-0 w-5 h-5 rounded text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                  aria-label={`Delete "${task.title}"`}
                  title="Delete task"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>

                {/* Task Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 break-words">
                    {task.title}
                  </p>
                  {task.notes && (
                    <p className="mt-1 text-sm text-gray-500 break-words line-clamp-2">
                      {task.notes}
                    </p>
                  )}

                  {/* Task metadata */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {/* Contexts */}
                    {task.contexts?.map((ctx) => (
                      <span
                        key={ctx.id}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {ctx.name}
                      </span>
                    ))}

                    {/* Created date */}
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                      Added {new Date(task.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleActivateTask(task.id)}
                  className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                  aria-label="Activate"
                >
                  Activate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SomedayMaybePage;
