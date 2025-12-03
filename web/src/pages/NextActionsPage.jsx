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
import ErrorAlert from '../components/ErrorAlert';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import TaskContextBadges from '../components/TaskContextBadges';
import useAutoCleanError from '../hooks/useAutoCleanError';

const NextActionsPage = () => {
  const dispatch = useDispatch();
  const tasks = useSelector(selectNextActions);
  const contexts = useSelector(selectAllContexts);
  const isLoading = useSelector(selectTasksLoading);
  const error = useSelector(selectTasksError);

  const [selectedContextId, setSelectedContextId] = useState(null);

  useEffect(() => {
    dispatch(fetchNextActions());
  }, [dispatch]);

  useAutoCleanError(error);

  const filteredTasks = useMemo(() => {
    if (!selectedContextId) {
      return tasks;
    }
    return tasks.filter((task) =>
      task.contexts?.some((ctx) => ctx.id === selectedContextId)
    );
  }, [tasks, selectedContextId]);

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

  const emptyIcon = (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <ContextFilterSidebar
        selectedContextId={selectedContextId}
        onContextSelect={handleContextSelect}
        taskCounts={taskCounts}
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <PageHeader
            title="Next Actions"
            description="Tasks you can do right now"
            count={filteredTasks.length}
            countColor="blue"
            onRefresh={handleRefresh}
          />

          <ErrorAlert message={error} onDismiss={() => dispatch(clearError())} />

          {isLoading && tasks.length === 0 && (
            <LoadingState message="Loading next actions..." color="blue" />
          )}

          {!isLoading && filteredTasks.length === 0 && (
            <EmptyState
              icon={emptyIcon}
              title="No Next Actions"
              message={selectedContextId
                ? 'No tasks in this context. Select "All" to see all tasks.'
                : 'Process your inbox to create next actions.'}
            />
          )}

          {filteredTasks.length > 0 && (
            <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
              {filteredTasks.map((task) => (
                <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                      aria-label={`Complete "${task.title}"`}
                      title="Complete task"
                    >
                      <span className="sr-only">Complete</span>
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 break-words">
                        {task.title}
                      </p>
                      {task.notes && (
                        <p className="mt-1 text-sm text-gray-500 break-words line-clamp-2">
                          {task.notes}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap gap-2">
                        {task.energy_level && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getEnergyBadgeColor(task.energy_level)}`}>
                            {task.energy_level}
                          </span>
                        )}

                        {task.time_estimate && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatTimeEstimate(task.time_estimate)}
                          </span>
                        )}

                        {task.due_date && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}

                        <TaskContextBadges contexts={task.contexts} />
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
