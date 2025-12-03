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
import ErrorAlert from '../components/ErrorAlert';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import TaskList from '../components/TaskList';
import TaskContextBadges from '../components/TaskContextBadges';
import useAutoCleanError from '../hooks/useAutoCleanError';

const SomedayMaybePage = () => {
  const dispatch = useDispatch();
  const tasks = useSelector(selectSomedayMaybe);
  const isLoading = useSelector(selectTasksLoading);
  const error = useSelector(selectTasksError);

  useEffect(() => {
    dispatch(fetchSomedayMaybe());
  }, [dispatch]);

  useAutoCleanError(error);

  const handleActivateTask = async (taskId) => {
    try {
      await dispatch(
        updateTaskStatus({ taskId, status: TASK_STATUS.NEXT_ACTION })
      ).unwrap();
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

  const emptyIcon = (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Someday/Maybe"
        description="Ideas and tasks deferred for later"
        count={tasks.length}
        countColor="purple"
        onRefresh={handleRefresh}
      />

      <ErrorAlert message={error} onDismiss={() => dispatch(clearError())} />

      {isLoading && tasks.length === 0 && (
        <LoadingState message="Loading someday/maybe tasks..." color="purple" />
      )}

      {!isLoading && tasks.length === 0 && (
        <EmptyState
          icon={emptyIcon}
          title="No Someday/Maybe Items"
          message="Your dreams and future ideas will appear here."
        />
      )}

      <TaskList>
        {tasks.map((task) => (
          <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start gap-3">
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

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 break-words">
                  {task.title}
                </p>
                {task.notes && (
                  <p className="mt-1 text-sm text-gray-500 break-words line-clamp-2">
                    {task.notes}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <TaskContextBadges contexts={task.contexts} />

                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                    Added {new Date(task.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

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
      </TaskList>
    </div>
  );
};

export default SomedayMaybePage;
