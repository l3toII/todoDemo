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
import TaskList from '../components/TaskList';
import TaskListItem from '../components/TaskListItem';
import DueDateBadge from '../components/DueDateBadge';
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

      <TaskList>
        {tasksWithDuration.map((task) => (
          <TaskListItem
            key={task.id}
            task={task}
            onComplete={handleCompleteTask}
            onAction={handleMoveToNextActions}
            actionLabel="Move to Next Actions"
            titleBadge={
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getWaitingBadgeColor(task.waitingDays)}`}>
                {formatWaitingDuration(task.waitingDays)}
              </span>
            }
            metadataBadges={<DueDateBadge date={task.due_date} />}
          />
        ))}
      </TaskList>
    </div>
  );
};

export default WaitingForPage;
