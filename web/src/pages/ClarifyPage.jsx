import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchInboxTasks,
  selectInboxTasks,
  selectTasksLoading,
  selectTasksError,
  selectInboxCount,
  clearError,
} from '../features/tasks/tasksSlice';
import ClarifyWizard from '../features/tasks/ClarifyWizard';

const ClarifyPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const inboxTasks = useSelector(selectInboxTasks);
  const loading = useSelector(selectTasksLoading);
  const error = useSelector(selectTasksError);
  const inboxCount = useSelector(selectInboxCount);

  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [clarifiedCount, setClarifiedCount] = useState(0);
  const [initialCount, setInitialCount] = useState(0);

  // Fetch inbox tasks on mount
  useEffect(() => {
    dispatch(fetchInboxTasks());
  }, [dispatch]);

  // Store initial count when tasks are first loaded
  useEffect(() => {
    if (inboxTasks.length > 0 && initialCount === 0) {
      setInitialCount(inboxTasks.length);
    }
  }, [inboxTasks.length, initialCount]);

  // Reset index if it's out of bounds after task removal
  // When a task is removed, the array shrinks, so we need to adjust the index
  // to point to the next valid task (which is now at the same index position)
  useEffect(() => {
    if (inboxTasks.length > 0 && currentTaskIndex >= inboxTasks.length) {
      // Clamp to the last valid index instead of resetting to 0
      setCurrentTaskIndex(inboxTasks.length - 1);
    }
  }, [inboxTasks.length, currentTaskIndex]);

  // Current task to clarify
  const currentTask = inboxTasks[currentTaskIndex];

  // Handle task clarification complete
  // Note: The task is already removed from inbox by Redux reducer
  // So we just increment clarified count, the index stays the same
  // because the array has shifted
  const handleTaskComplete = useCallback(() => {
    setClarifiedCount(prev => prev + 1);
    // No need to increment index - the task was removed from the array
    // so the next task is now at the current index
    // If we were at the last task, the useEffect above will reset to 0
  }, []);

  // Skip current task
  const handleSkip = useCallback(() => {
    if (currentTaskIndex < inboxTasks.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
    } else {
      // Loop back to first
      setCurrentTaskIndex(0);
    }
  }, [currentTaskIndex, inboxTasks.length]);

  // Clear error
  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Empty inbox state (but not when there's an error - show error instead)
  if (!loading && inboxTasks.length === 0 && !error) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Inbox Zero!</h2>
          <p className="text-gray-600 mb-6">
            {clarifiedCount > 0
              ? `Great work! You've clarified ${clarifiedCount} task${clarifiedCount > 1 ? 's' : ''}.`
              : 'Your inbox is empty. All tasks have been processed.'}
          </p>
          <div className="space-x-4">
            <button
              onClick={() => navigate('/inbox')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Inbox
            </button>
            <button
              onClick={() => navigate('/next-actions')}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              View Next Actions
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading && inboxTasks.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your inbox...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clarify & Process</h1>
            <p className="text-gray-600">
              Process each item in your inbox using the GTD workflow
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{inboxCount}</div>
            <div className="text-sm text-gray-500">items remaining</div>
          </div>
        </div>

        {/* Progress bar */}
        {(inboxTasks.length > 0 || clarifiedCount > 0) && (
          <div className="relative">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                style={{
                  width: initialCount > 0 ? `${(clarifiedCount / initialCount) * 100}%` : '0%',
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{clarifiedCount} clarified</span>
              <span>
                Task {currentTaskIndex + 1} of {inboxCount}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-700">{error}</span>
            </div>
            <button
              onClick={handleClearError}
              className="text-red-500 hover:text-red-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* GTD Tips */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-700">
            <strong>GTD Tip:</strong> Ask yourself: "Is this actionable?" If yes, "Will it take less than 2 minutes?"
            If so, do it now. Otherwise, delegate, defer, or organize it.
          </div>
        </div>
      </div>

      {/* Clarify Wizard */}
      {currentTask && (
        <ClarifyWizard
          key={currentTask.id}
          task={currentTask}
          onComplete={handleTaskComplete}
          onSkip={handleSkip}
        />
      )}

      {/* Task list preview */}
      {inboxTasks.length > 1 && (
        <div className="mt-8">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Up next in your inbox</h3>
          <div className="space-y-2">
            {inboxTasks.slice(currentTaskIndex + 1, currentTaskIndex + 4).map((task, index) => (
              <div
                key={task.id}
                className={`p-3 bg-gray-50 rounded-lg border border-gray-200 ${
                  index === 0 ? 'opacity-70' : 'opacity-50'
                }`}
              >
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center mr-3 text-xs text-gray-500">
                    {currentTaskIndex + index + 2}
                  </div>
                  <span className="text-gray-700 truncate">{task.title}</span>
                </div>
              </div>
            ))}
            {inboxTasks.length - currentTaskIndex - 1 > 3 && (
              <div className="text-center text-sm text-gray-500">
                +{inboxTasks.length - currentTaskIndex - 4} more items
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="mt-8 flex justify-center space-x-4">
        <button
          onClick={() => navigate('/inbox')}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          Back to Inbox
        </button>
        <button
          onClick={() => dispatch(fetchInboxTasks())}
          className="px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors"
        >
          Refresh
        </button>
      </div>
    </div>
  );
};

export default ClarifyPage;
