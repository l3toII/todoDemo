import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { clearError } from '../features/tasks/tasksSlice';

/**
 * Hook to automatically clear error after a specified delay.
 * @param {string|null} error - The error message
 * @param {number} delay - Delay in milliseconds before clearing (default: 5000)
 */
const useAutoCleanError = (error, delay = 5000) => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [error, delay, dispatch]);
};

export default useAutoCleanError;
