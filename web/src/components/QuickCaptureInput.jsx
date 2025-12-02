import { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import { createTask, optimisticAddTask } from '../features/inbox/inboxSlice';
import Spinner from './Spinner';

/**
 * QuickCaptureInput - Fast task capture with < 3 interactions
 *
 * Interaction flow:
 * 1. Type task title
 * 2. Press Enter (or click button)
 * Done! Task captured.
 */
const QuickCaptureInput = ({ autoFocus = false, onTaskCreated }) => {
  const dispatch = useDispatch();
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  // Focus input when autoFocus is true
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = async (e) => {
    e?.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    // Optimistic update - add task immediately to UI
    const { payload } = dispatch(optimisticAddTask({ title: trimmedTitle }));
    const { tempId } = payload;

    // Clear input immediately for fast UX
    setTitle('');

    try {
      await dispatch(createTask({ title: trimmedTitle, tempId })).unwrap();
      onTaskCreated?.();
    } catch (err) {
      setError(err.message || 'Failed to create task');
      // Optimistic update rollback is handled by the slice
    } finally {
      setIsSubmitting(false);
      // Refocus input for continuous capture
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    // Clear error on new input
    if (error) {
      setError(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What's on your mind? Press Enter to capture..."
            className={`w-full px-4 py-3 text-gray-900 placeholder-gray-500 bg-white border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={isSubmitting}
            aria-label="Quick capture input"
            aria-describedby={error ? 'capture-error' : undefined}
          />
          {isSubmitting && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Spinner size="md" className="text-blue-500" />
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={!title.trim() || isSubmitting}
          className="px-4 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Add task"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      {error && (
        <p id="capture-error" className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <p className="mt-2 text-xs text-gray-500">
        Tip: Press <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">N</kbd> anywhere to quick capture
      </p>
    </form>
  );
};

QuickCaptureInput.propTypes = {
  autoFocus: PropTypes.bool,
  onTaskCreated: PropTypes.func,
};

export default QuickCaptureInput;
