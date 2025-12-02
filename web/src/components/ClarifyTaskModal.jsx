import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import TwoMinuteTimer from './TwoMinuteTimer';
import { TASK_STATUS, ENERGY_LEVEL } from '../features/tasks/tasksSlice';

// Clarification steps following GTD workflow
const STEPS = {
  INITIAL: 'initial',
  ACTIONABLE: 'actionable',
  TWO_MINUTE: 'twoMinute',
  TIMER: 'timer',
  DELEGATE_OR_DEFER: 'delegateOrDefer',
  NON_ACTIONABLE: 'nonActionable',
  MULTI_STEP: 'multiStep',
  DETAILS: 'details',
};

const ClarifyTaskModal = ({ task, onClarify, onClose, onConvertToProject, isLoading }) => {
  const [currentStep, setCurrentStep] = useState(STEPS.INITIAL);
  const [clarificationData, setClarificationData] = useState({
    status: null,
    notes: task?.notes || '',
    energyLevel: null,
    timeEstimate: null,
    dueDate: null,
    projectId: null,
    projectTitle: '',
    projectOutcome: '',
  });

  // Handle the initial "Is it actionable?" question
  const handleActionableChoice = useCallback((isActionable) => {
    if (isActionable) {
      setCurrentStep(STEPS.ACTIONABLE);
    } else {
      setCurrentStep(STEPS.NON_ACTIONABLE);
    }
  }, []);

  // Handle "Can it be done in 2 minutes?"
  const handleTwoMinuteChoice = useCallback((canBeDoneQuickly) => {
    if (canBeDoneQuickly) {
      setCurrentStep(STEPS.TIMER);
    } else {
      setCurrentStep(STEPS.MULTI_STEP);
    }
  }, []);

  // Handle "Is it a single action or multiple steps?"
  const handleMultiStepChoice = useCallback((isMultiStep) => {
    if (isMultiStep) {
      // Convert to project
      setClarificationData((prev) => ({
        ...prev,
        projectTitle: task?.title || '',
      }));
      setCurrentStep(STEPS.DETAILS);
    } else {
      setCurrentStep(STEPS.DELEGATE_OR_DEFER);
    }
  }, [task]);

  // Handle delegate or defer choice
  const handleDelegateOrDefer = useCallback((choice) => {
    let newStatus;
    switch (choice) {
      case 'delegate':
        newStatus = TASK_STATUS.WAITING_FOR;
        break;
      case 'defer':
        newStatus = TASK_STATUS.NEXT_ACTION;
        break;
      case 'someday':
        newStatus = TASK_STATUS.SOMEDAY_MAYBE;
        break;
      default:
        newStatus = TASK_STATUS.NEXT_ACTION;
    }
    setClarificationData((prev) => ({ ...prev, status: newStatus }));
    setCurrentStep(STEPS.DETAILS);
  }, []);

  // Handle non-actionable choice
  const handleNonActionableChoice = useCallback((choice) => {
    let newStatus;
    switch (choice) {
      case 'trash':
        newStatus = TASK_STATUS.DELETED;
        break;
      case 'reference':
        newStatus = TASK_STATUS.REFERENCE;
        break;
      case 'someday':
        newStatus = TASK_STATUS.SOMEDAY_MAYBE;
        break;
      default:
        newStatus = TASK_STATUS.REFERENCE;
    }
    setClarificationData((prev) => ({ ...prev, status: newStatus }));

    // For trash, just submit immediately
    if (choice === 'trash') {
      onClarify(task.id, { status: newStatus });
    } else {
      setCurrentStep(STEPS.DETAILS);
    }
  }, [task, onClarify]);

  // Handle timer completion (task done in 2 minutes)
  const handleTimerComplete = useCallback(() => {
    onClarify(task.id, { status: TASK_STATUS.COMPLETED });
  }, [task, onClarify]);

  // Handle timer cancel (task takes longer than 2 minutes)
  const handleTimerCancel = useCallback(() => {
    setCurrentStep(STEPS.MULTI_STEP);
  }, []);

  // Handle final submission
  const handleSubmit = useCallback(() => {
    if (clarificationData.projectTitle) {
      // Convert to project
      onConvertToProject(task.id, {
        title: clarificationData.projectTitle,
        outcome: clarificationData.projectOutcome,
      });
    } else {
      onClarify(task.id, clarificationData);
    }
  }, [task, clarificationData, onClarify, onConvertToProject]);

  // Update clarification data
  const updateData = useCallback((field, value) => {
    setClarificationData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Render the current step
  const renderStep = () => {
    switch (currentStep) {
      case STEPS.INITIAL:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Is this actionable?</h3>
            <p className="text-gray-600">
              Can you do something about "{task?.title}"?
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => handleActionableChoice(true)}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                Yes, it's actionable
              </button>
              <button
                onClick={() => handleActionableChoice(false)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              >
                No, it's not
              </button>
            </div>
          </div>
        );

      case STEPS.ACTIONABLE:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Can it be done in 2 minutes or less?</h3>
            <p className="text-gray-600">
              The 2-minute rule: If it takes less than 2 minutes, do it now.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => handleTwoMinuteChoice(true)}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
              >
                Yes, do it now
              </button>
              <button
                onClick={() => handleTwoMinuteChoice(false)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              >
                No, it takes longer
              </button>
            </div>
          </div>
        );

      case STEPS.TIMER:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 text-center">Do it now!</h3>
            <TwoMinuteTimer
              onComplete={handleTimerComplete}
              onCancel={handleTimerCancel}
              autoStart={true}
            />
          </div>
        );

      case STEPS.MULTI_STEP:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Is this a single action or a project?</h3>
            <p className="text-gray-600">
              A project is any outcome that requires more than one action step.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => handleMultiStepChoice(false)}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                Single action
              </button>
              <button
                onClick={() => handleMultiStepChoice(true)}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
              >
                Project (multiple steps)
              </button>
            </div>
          </div>
        );

      case STEPS.DELEGATE_OR_DEFER:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">What's the next step?</h3>
            <p className="text-gray-600">
              What should happen with this action?
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleDelegateOrDefer('defer')}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-left"
              >
                <span className="font-medium">Do it myself</span>
                <span className="block text-sm text-blue-200">Add to Next Actions</span>
              </button>
              <button
                onClick={() => handleDelegateOrDefer('delegate')}
                className="w-full px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors text-left"
              >
                <span className="font-medium">Delegate it</span>
                <span className="block text-sm text-yellow-200">Add to Waiting For</span>
              </button>
              <button
                onClick={() => handleDelegateOrDefer('someday')}
                className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors text-left"
              >
                <span className="font-medium">Maybe later</span>
                <span className="block text-sm text-gray-300">Add to Someday/Maybe</span>
              </button>
            </div>
          </div>
        );

      case STEPS.NON_ACTIONABLE:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">What is it?</h3>
            <p className="text-gray-600">
              If it's not actionable, what should we do with it?
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleNonActionableChoice('trash')}
                className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors text-left"
              >
                <span className="font-medium">Trash it</span>
                <span className="block text-sm text-red-200">Delete permanently</span>
              </button>
              <button
                onClick={() => handleNonActionableChoice('reference')}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-left"
              >
                <span className="font-medium">Reference material</span>
                <span className="block text-sm text-blue-200">Keep for future reference</span>
              </button>
              <button
                onClick={() => handleNonActionableChoice('someday')}
                className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors text-left"
              >
                <span className="font-medium">Someday/Maybe</span>
                <span className="block text-sm text-gray-300">Incubate for later</span>
              </button>
            </div>
          </div>
        );

      case STEPS.DETAILS:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {clarificationData.projectTitle ? 'Project Details' : 'Task Details'}
            </h3>

            {clarificationData.projectTitle ? (
              // Project form
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Title
                  </label>
                  <input
                    type="text"
                    value={clarificationData.projectTitle}
                    onChange={(e) => updateData('projectTitle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="What's the desired outcome?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Outcome Description
                  </label>
                  <textarea
                    value={clarificationData.projectOutcome}
                    onChange={(e) => updateData('projectOutcome', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="What does success look like?"
                  />
                </div>
              </>
            ) : (
              // Task form
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={clarificationData.notes}
                    onChange={(e) => updateData('notes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Add any relevant details..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Energy Level
                  </label>
                  <div className="flex space-x-2">
                    {[
                      { value: ENERGY_LEVEL.LOW, label: 'Low', color: 'green' },
                      { value: ENERGY_LEVEL.MEDIUM, label: 'Medium', color: 'yellow' },
                      { value: ENERGY_LEVEL.HIGH, label: 'High', color: 'red' },
                    ].map(({ value, label, color }) => (
                      <button
                        key={value}
                        onClick={() => updateData('energyLevel', value)}
                        className={`flex-1 px-3 py-2 rounded-md border transition-colors ${
                          clarificationData.energyLevel === value
                            ? `bg-${color}-100 border-${color}-500 text-${color}-700`
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time Estimate (minutes)
                  </label>
                  <select
                    value={clarificationData.timeEstimate || ''}
                    onChange={(e) => updateData('timeEstimate', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select...</option>
                    <option value="5">5 minutes</option>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                    <option value="240">4 hours</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date (optional)
                  </label>
                  <input
                    type="date"
                    value={clarificationData.dueDate || ''}
                    onChange={(e) => updateData('dueDate', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            <div className="flex space-x-4 pt-4">
              <button
                onClick={() => setCurrentStep(STEPS.INITIAL)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              >
                Start Over
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Clarify</h2>
            <p className="text-sm text-gray-500 truncate max-w-xs">{task?.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderStep()}
        </div>

        {/* Progress indicator */}
        <div className="px-6 pb-4">
          <div className="flex justify-center space-x-2">
            {Object.values(STEPS).slice(0, 5).map((step, index) => (
              <div
                key={step}
                className={`w-2 h-2 rounded-full ${
                  Object.values(STEPS).indexOf(currentStep) >= index
                    ? 'bg-blue-600'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

ClarifyTaskModal.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    notes: PropTypes.string,
    status: PropTypes.string,
  }).isRequired,
  onClarify: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onConvertToProject: PropTypes.func,
  isLoading: PropTypes.bool,
};

ClarifyTaskModal.defaultProps = {
  onConvertToProject: () => {},
  isLoading: false,
};

export default ClarifyTaskModal;
