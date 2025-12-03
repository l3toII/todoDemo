import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchWaitingFor,
  completeTask,
  updateTaskStatus,
  selectWaitingFor,
  selectTasksLoading,
  selectTasksError,
  clearError,
  TASK_STATUS,
} from '../features/tasks/tasksSlice';
import Spinner from '../components/Spinner';

const WaitingForPage = () => {
  const dispatch = useDispatch();
  const tasks = useSelector(selectWaitingFor);
  const isLoading = useSelector(selectTasksLoading);
  const error = useSelector(selectTasksError);

  // Fetch waiting for tasks on mount
  useEffect(() => {
    dispatch(fetchWaitingFor());
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

  // Calculate waiting duration for each task
  const tasksWithDuration = useMemo(() => {
    return tasks.map((task) => {
      const createdAt = new Date(task.created_at);
      const now = new Date();
      const diffTime = Math.abs(now - createdAt);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return { ...task, waitingDays: diffDays };
    });
  }, [tasks]);

  const handleCompleteTask = async (taskId) => {
    try {
      await dispatch(completeTask(taskId)).unwrap();
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  const handleMoveToNextActions = async (taskId) => {
    try {
      await dispatch(
        updateTaskStatus({ taskId, status: TASK_STATUS.NEXT_ACTION })
      ).unwrap();
      // Refresh the list
      dispatch(fetchWaitingFor());
    } catch (err) {
      console.error('Failed to move task:', err);
    }
  };

  const handleRefresh = () => {
    dispatch(fetchWaitingFor());
  };

  const formatWaitingDuration = (days) => {
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    if (days < 7) return `${days} days`;
    const weeks = Math.floor(days / 7);
    if (weeks === 1) return '1 week';
    if (days < 30) return `${weeks} weeks`;
    const months = Math.floor(days / 30);
    if (months === 1) return '1 month';
    return `${months} months`;
  };

  const getWaitingBadgeColor = (days) => {
    if (days < 7) return 'bg-green-100 text-green-800';
    if (days < 14) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Waiting For</h1>
            <p className="mt-1 text-sm text-gray-500">
              Tasks delegated or waiting on others
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
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
          <Spinner size="lg" className="text-orange-500" />
          <span className="ml-2 text-gray-500">Loading waiting for tasks...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && tasks.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Waiting For Items</h3>
          <p className="mt-1 text-sm text-gray-500">
            Nothing is blocked or delegated right now.
          </p>
        </div>
      )}

      {/* Task List */}
      {tasksWithDuration.length > 0 && (
        <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
          {tasksWithDuration.map((task) => (
            <div
              key={task.id}
              className="p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Complete Button */}
                <button
                  onClick={() => handleCompleteTask(task.id)}
                  className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                  aria-label={`Complete "${task.title}"`}
                  title="Complete task"
                >
                  <span className="sr-only">Complete</span>
                </button>

                {/* Task Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 break-words">
                      {task.title}
                    </p>
                    {/* Waiting Duration Badge */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getWaitingBadgeColor(task.waitingDays)}`}>
                      {formatWaitingDuration(task.waitingDays)}
                    </span>
                  </div>
                  {task.notes && (
                    <p className="mt-1 text-sm text-gray-500 break-words line-clamp-2">
                      {task.notes}
                    </p>
                  )}

                  {/* Task metadata */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {/* Due Date */}
                    {task.due_date && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}

                    {/* Contexts */}
                    {task.contexts?.map((ctx) => (
                      <span
                        key={ctx.id}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {ctx.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleMoveToNextActions(task.id)}
                  className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  aria-label="Move to Next Actions"
                >
                  Move to Next Actions
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WaitingForPage;
