import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

const TWO_MINUTES_IN_SECONDS = 120;

const TwoMinuteTimer = ({ onComplete, onCancel, autoStart = false }) => {
  const [timeLeft, setTimeLeft] = useState(TWO_MINUTES_IN_SECONDS);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isCompleted, setIsCompleted] = useState(false);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercent = ((TWO_MINUTES_IN_SECONDS - timeLeft) / TWO_MINUTES_IN_SECONDS) * 100;

  // Timer logic
  useEffect(() => {
    let interval = null;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !isCompleted) {
      setIsRunning(false);
      setIsCompleted(true);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, isCompleted]);

  const handleStart = useCallback(() => {
    setIsRunning(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    setTimeLeft(TWO_MINUTES_IN_SECONDS);
    setIsRunning(false);
    setIsCompleted(false);
  }, []);

  const handleComplete = useCallback(() => {
    setIsRunning(false);
    if (onComplete) {
      onComplete();
    }
  }, [onComplete]);

  const handleCancel = useCallback(() => {
    setIsRunning(false);
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  // Determine timer color based on time left
  const getTimerColor = () => {
    if (timeLeft <= 30) return 'text-red-600';
    if (timeLeft <= 60) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressColor = () => {
    if (timeLeft <= 30) return 'bg-red-500';
    if (timeLeft <= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-auto">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          2-Minute Rule Timer
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {isCompleted
            ? 'Time is up! Did you complete the task?'
            : 'Can you complete this task in 2 minutes or less?'}
        </p>

        {/* Timer Display */}
        <div className={`text-5xl font-mono font-bold mb-4 ${getTimerColor()}`}>
          {formatTime(timeLeft)}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className={`h-2 rounded-full transition-all duration-1000 ${getProgressColor()}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Timer Controls */}
        <div className="flex justify-center space-x-3 mb-4">
          {!isRunning && !isCompleted && (
            <button
              onClick={handleStart}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              {timeLeft < TWO_MINUTES_IN_SECONDS ? 'Resume' : 'Start'}
            </button>
          )}

          {isRunning && (
            <button
              onClick={handlePause}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors"
            >
              Pause
            </button>
          )}

          {(isRunning || timeLeft < TWO_MINUTES_IN_SECONDS) && !isCompleted && (
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={handleComplete}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Done!
          </button>
          <button
            onClick={handleCancel}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            Takes longer
          </button>
        </div>

        {/* Help text */}
        <p className="text-xs text-gray-500 mt-4">
          If it takes less than 2 minutes, do it now. Otherwise, delegate or defer it.
        </p>
      </div>
    </div>
  );
};

TwoMinuteTimer.propTypes = {
  onComplete: PropTypes.func,
  onCancel: PropTypes.func,
  autoStart: PropTypes.bool,
};

export default TwoMinuteTimer;
