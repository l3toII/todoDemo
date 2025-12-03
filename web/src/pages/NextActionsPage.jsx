import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchNextActions,
  completeTask,
  selectNextActions,
  selectTasksLoading,
  selectTasksError,
  clearError,
} from '../features/tasks/tasksSlice';
import { selectAllContexts } from '../features/contexts/contextsSlice';
import ContextFilterSidebar from '../components/ContextFilterSidebar';
import Spinner from '../components/Spinner';

const NextActionsPage = () => {
  const dispatch = useDispatch();
  const tasks = useSelector(selectNextActions);
  const contexts = useSelector(selectAllContexts);
  const isLoading = useSelector(selectTasksLoading);
  const error = useSelector(selectTasksError);

  const [selectedContextId, setSelectedContextId] = useState(null);

  // Fetch next actions on mount
  useEffect(() => {
    dispatch(fetchNextActions());
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

  // Filter tasks by selected context
  const filteredTasks = useMemo(() => {
    if (!selectedContextId) {
      return tasks;
    }
    return tasks.filter((task) =>
      task.contexts?.some((ctx) => ctx.id === selectedContextId)
    );
  }, [tasks, selectedContextId]);

  // Calculate task counts per context
  const taskCounts = useMemo(() => {
    const counts = {};
    tasks.forEach((task) => {
      task.contexts?.forEach((ctx) => {
        counts[ctx.id] = (counts[ctx.id] || 0) + 1;
      });
    });
    return counts;
  }, [tasks]);

  const handleContextSelect = (contextId) => {
    setSelectedContextId(contextId);
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await dispatch(completeTask(taskId)).unwrap();
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  const handleRefresh = () => {
    dispatch(fetchNextActions());
  };

  const formatTimeEstimate = (minutes) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getEnergyBadgeColor = (level) => {
    switch (level) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Context Filter Sidebar */}
      <ContextFilterSidebar
        selectedContextId={selectedContextId}
        onContextSelect={handleContextSelect}
        taskCounts={taskCounts}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Next Actions</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Tasks you can do right now
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {filteredTasks.length}
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
              <Spinner size="lg" className="text-blue-500" />
              <span className="ml-2 text-gray-500">Loading next actions...</span>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredTasks.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Next Actions</h3>
              <p className="mt-1 text-sm text-gray-500">
                {selectedContextId
                  ? 'No tasks in this context. Select "All" to see all tasks.'
                  : 'Process your inbox to create next actions.'}
              </p>
            </div>
          )}

          {/* Task List */}
          {filteredTasks.length > 0 && (
            <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
              {filteredTasks.map((task) => (
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
                      <p className="text-sm font-medium text-gray-900 break-words">
                        {task.title}
                      </p>
                      {task.notes && (
                        <p className="mt-1 text-sm text-gray-500 break-words line-clamp-2">
                          {task.notes}
                        </p>
                      )}

                      {/* Task metadata */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {/* Energy Level */}
                        {task.energy_level && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getEnergyBadgeColor(task.energy_level)}`}>
                            {task.energy_level}
                          </span>
                        )}

                        {/* Time Estimate */}
                        {task.time_estimate && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatTimeEstimate(task.time_estimate)}
                          </span>
                        )}

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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NextActionsPage;
