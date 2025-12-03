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
import ErrorAlert from '../components/ErrorAlert';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import TaskContextBadges from '../components/TaskContextBadges';
import useAutoCleanError from '../hooks/useAutoCleanError';

const WaitingForPage = () => {
  const dispatch = useDispatch();
  const tasks = useSelector(selectWaitingFor);
  const isLoading = useSelector(selectTasksLoading);
  const error = useSelector(selectTasksError);

  useEffect(() => {
    dispatch(fetchWaitingFor());
  }, [dispatch]);

  useAutoCleanError(error);

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

  const emptyIcon = (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Waiting For"
        description="Tasks delegated or waiting on others"
        count={tasks.length}
        countColor="orange"
        onRefresh={handleRefresh}
      />

      <ErrorAlert message={error} onDismiss={() => dispatch(clearError())} />

      {isLoading && tasks.length === 0 && (
        <LoadingState message="Loading waiting for tasks..." color="orange" />
      )}

      {!isLoading && tasks.length === 0 && (
        <EmptyState
          icon={emptyIcon}
          title="No Waiting For Items"
          message="Nothing is blocked or delegated right now."
        />
      )}

      {tasksWithDuration.length > 0 && (
        <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
          {tasksWithDuration.map((task) => (
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
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 break-words">
                      {task.title}
                    </p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getWaitingBadgeColor(task.waitingDays)}`}>
                      {formatWaitingDuration(task.waitingDays)}
                    </span>
                  </div>
                  {task.notes && (
                    <p className="mt-1 text-sm text-gray-500 break-words line-clamp-2">
                      {task.notes}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
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
