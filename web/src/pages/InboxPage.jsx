import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchInbox,
  deleteTask,
  completeTask,
  selectInboxTasks,
  selectInboxLoading,
  selectInboxError,
  selectInboxCount,
  selectHasOverflow,
  clearError,
  optimisticDeleteTask,
  rollbackOptimisticDelete,
} from '../features/inbox/inboxSlice';
import QuickCaptureInput from '../components/QuickCaptureInput';
import { useQuickCaptureShortcut } from '../hooks/useKeyboardShortcuts';

const InboxPage = () => {
  const dispatch = useDispatch();
  const tasks = useSelector(selectInboxTasks);
  const isLoading = useSelector(selectInboxLoading);
  const error = useSelector(selectInboxError);
  const count = useSelector(selectInboxCount);
  const hasOverflow = useSelector(selectHasOverflow);

  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const quickCaptureRef = useRef(null);

  // Fetch inbox on mount
  useEffect(() => {
    dispatch(fetchInbox());
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

  // Keyboard shortcut for quick capture (Ctrl+N)
  useQuickCaptureShortcut(() => {
    setQuickCaptureOpen(true);
    // Focus the input after modal opens
    setTimeout(() => {
      quickCaptureRef.current?.focus();
    }, 100);
  });

  const handleDeleteTask = async (taskId) => {
    // Optimistic delete
    dispatch(optimisticDeleteTask({ id: taskId }));

    try {
      await dispatch(deleteTask(taskId)).unwrap();
    } catch {
      // Rollback on failure
      dispatch(rollbackOptimisticDelete({ id: taskId }));
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await dispatch(completeTask(taskId)).unwrap();
    } catch {
      // Error handling is done by the slice
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
            <p className="mt-1 text-sm text-gray-500">
              Capture everything, process later
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {count} {count === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>
      </div>

      {/* Overflow Warning */}
      {hasOverflow && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex">
            <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Inbox Overflow</h3>
              <p className="mt-1 text-sm text-yellow-700">
                You have over 100 items in your inbox. Consider processing some tasks to maintain a clear mind.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Capture Input */}
      <div className="mb-6">
        <QuickCaptureInput autoFocus />
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
          <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="ml-2 text-gray-500">Loading inbox...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && tasks.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Inbox Zero!</h3>
          <p className="mt-1 text-sm text-gray-500">
            Your mind is clear. Capture new ideas above.
          </p>
        </div>
      )}

      {/* Task List */}
      {tasks.length > 0 && (
        <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 hover:bg-gray-50 transition-colors ${
                task.isOptimistic ? 'opacity-70' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Complete Button */}
                <button
                  onClick={() => handleCompleteTask(task.id)}
                  disabled={task.isOptimistic}
                  className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                  aria-label={`Mark "${task.title}" as complete`}
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
                  <p className="mt-1 text-xs text-gray-400">
                    {formatDate(task.created_at)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex items-center gap-1">
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    disabled={task.isOptimistic}
                    className="p-1 text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded disabled:opacity-50"
                    aria-label={`Delete "${task.title}"`}
                    title="Delete task"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Capture Modal (triggered by Ctrl+N) */}
      {quickCaptureOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-start justify-center min-h-screen pt-20 px-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setQuickCaptureOpen(false)}
            ></div>

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6 z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Quick Capture</h2>
                <button
                  onClick={() => setQuickCaptureOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <QuickCaptureInput
                autoFocus
                onTaskCreated={() => setQuickCaptureOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InboxPage;
