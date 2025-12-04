import { useState, useCallback, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import {
  clarifyTask,
  completeTask,
  deleteTask,
  convertToProject,
  selectTasksClarifying,
  TASK_STATUS,
} from './tasksSlice';
import { selectAllContexts } from '../contexts/contextsSlice';
import { selectActiveProjects } from '../projects/projectsSlice';
import { tasksAPI } from '../../services/api';
import TwoMinuteTimer from '../../components/TwoMinuteTimer';
import ProjectSelector from '../../components/ProjectSelector';

// Wizard steps
const WIZARD_STEPS = {
  ACTIONABLE: 'actionable',
  TWO_MINUTE: 'twoMinute',
  DO_IT_NOW: 'doItNow',
  SINGLE_OR_PROJECT: 'singleOrProject',
  WHAT_TO_DO: 'whatToDo',
  NON_ACTIONABLE: 'nonActionable',
  ADD_DETAILS: 'addDetails',
  CREATE_PROJECT: 'createProject',
  ADD_TO_PROJECT: 'addToProject',
};

// Decision outcomes
const OUTCOMES = {
  COMPLETE_NOW: 'completeNow',
  NEXT_ACTION: 'nextAction',
  WAITING_FOR: 'waitingFor',
  SOMEDAY_MAYBE: 'somedayMaybe',
  REFERENCE: 'reference',
  TRASH: 'trash',
  PROJECT: 'project',
};

const ClarifyWizard = ({ task, onComplete, onSkip }) => {
  const dispatch = useDispatch();
  const isClarifying = useSelector(selectTasksClarifying);
  const contexts = useSelector(selectAllContexts);
  const activeProjects = useSelector(selectActiveProjects);

  const [currentStep, setCurrentStep] = useState(WIZARD_STEPS.ACTIONABLE);
  const [stepHistory, setStepHistory] = useState([]);
  const [outcome, setOutcome] = useState(null);
  const [formData, setFormData] = useState({
    notes: task?.notes || '',
    energyLevel: null,
    timeEstimate: null,
    dueDate: '',
    waitingForPerson: '',
    projectTitle: task?.title || '',
    projectOutcome: '',
    firstActionTitle: '',
    selectedContexts: [],
    selectedProjectId: null,
  });

  // Update form data
  const updateForm = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Handle final submission based on outcome
  // Can receive immediateOutcome for cases where we need to submit immediately
  // without waiting for state update (e.g., timer complete, trash)
  const handleSubmit = useCallback(async (immediateOutcome = null) => {
    const finalOutcome = immediateOutcome || outcome;

    try {
      switch (finalOutcome) {
        case OUTCOMES.COMPLETE_NOW:
          await dispatch(completeTask(task.id)).unwrap();
          break;

        case OUTCOMES.TRASH:
          await dispatch(deleteTask(task.id)).unwrap();
          break;

        case OUTCOMES.PROJECT:
          await dispatch(convertToProject({
            taskId: task.id,
            projectData: {
              title: formData.projectTitle,
              outcome: formData.projectOutcome,
            },
          })).unwrap();
          break;

        default: {
          // Map outcome to status
          const statusMap = {
            [OUTCOMES.NEXT_ACTION]: TASK_STATUS.NEXT_ACTION,
            [OUTCOMES.WAITING_FOR]: TASK_STATUS.WAITING_FOR,
            [OUTCOMES.SOMEDAY_MAYBE]: TASK_STATUS.SOMEDAY_MAYBE,
            [OUTCOMES.REFERENCE]: TASK_STATUS.REFERENCE,
          };

          const targetStatus = statusMap[finalOutcome];
          if (!targetStatus) {
            console.error('ClarifyWizard: Invalid outcome for clarification:', finalOutcome);
            throw new Error(`Invalid outcome: ${finalOutcome}`);
          }

          // P6-007: Append waitingForPerson to notes for WAITING_FOR status
          let finalNotes = formData.notes;
          if (finalOutcome === OUTCOMES.WAITING_FOR && formData.waitingForPerson.trim()) {
            finalNotes = `Waiting for: ${formData.waitingForPerson}\n\n${formData.notes}`.trim();
          }

          await dispatch(clarifyTask({
            taskId: task.id,
            clarificationData: {
              status: targetStatus,
              notes: finalNotes,
              energyLevel: formData.energyLevel,
              timeEstimate: formData.timeEstimate,
              dueDate: formData.dueDate || null,
              projectId: formData.selectedProjectId,
            },
          })).unwrap();

          // P6-003: Set contexts after clarify if any were selected
          if (formData.selectedContexts.length > 0) {
            try {
              await tasksAPI.setContexts(task.id, formData.selectedContexts);
            } catch (contextError) {
              console.error('Failed to set contexts:', contextError);
              // Don't fail the whole operation if context setting fails
            }
          }
        }
      }

      onComplete(task.id);
    } catch (error) {
      console.error('Failed to clarify task:', error);
    }
  }, [dispatch, task, outcome, formData, onComplete]);

  // Navigate to next step based on choice
  const goToStep = useCallback((step, newOutcome = null) => {
    setStepHistory(prev => [...prev, currentStep]);
    if (newOutcome) setOutcome(newOutcome);
    setCurrentStep(step);
  }, [currentStep]);

  // Go back to previous step
  const goBack = useCallback(() => {
    if (stepHistory.length > 0) {
      const prevStep = stepHistory[stepHistory.length - 1];
      setStepHistory(prev => prev.slice(0, -1));
      setCurrentStep(prevStep);
    }
  }, [stepHistory]);

  // Toggle context selection
  const toggleContext = useCallback((contextId) => {
    setFormData(prev => ({
      ...prev,
      selectedContexts: prev.selectedContexts.includes(contextId)
        ? prev.selectedContexts.filter(id => id !== contextId)
        : [...prev.selectedContexts, contextId],
    }));
  }, []);

  // P6-008: Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't handle if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'escape':
          if (onSkip) onSkip();
          break;

        case 'backspace':
          goBack();
          break;

        case 'y':
          if (currentStep === WIZARD_STEPS.ACTIONABLE) {
            goToStep(WIZARD_STEPS.TWO_MINUTE);
          } else if (currentStep === WIZARD_STEPS.TWO_MINUTE) {
            goToStep(WIZARD_STEPS.DO_IT_NOW);
          }
          break;

        case 'n':
          if (currentStep === WIZARD_STEPS.ACTIONABLE) {
            goToStep(WIZARD_STEPS.NON_ACTIONABLE);
          } else if (currentStep === WIZARD_STEPS.TWO_MINUTE) {
            goToStep(WIZARD_STEPS.SINGLE_OR_PROJECT);
          }
          break;

        case '1':
          if (currentStep === WIZARD_STEPS.WHAT_TO_DO) {
            setOutcome(OUTCOMES.NEXT_ACTION);
            goToStep(WIZARD_STEPS.ADD_DETAILS);
          } else if (currentStep === WIZARD_STEPS.NON_ACTIONABLE) {
            handleSubmit(OUTCOMES.TRASH);
          } else if (currentStep === WIZARD_STEPS.SINGLE_OR_PROJECT) {
            goToStep(WIZARD_STEPS.WHAT_TO_DO);
          }
          break;

        case '2':
          if (currentStep === WIZARD_STEPS.WHAT_TO_DO) {
            setOutcome(OUTCOMES.WAITING_FOR);
            goToStep(WIZARD_STEPS.ADD_DETAILS);
          } else if (currentStep === WIZARD_STEPS.NON_ACTIONABLE) {
            setOutcome(OUTCOMES.REFERENCE);
            goToStep(WIZARD_STEPS.ADD_DETAILS);
          } else if (currentStep === WIZARD_STEPS.SINGLE_OR_PROJECT) {
            setOutcome(OUTCOMES.PROJECT);
            goToStep(WIZARD_STEPS.CREATE_PROJECT);
          }
          break;

        case '3':
          if (currentStep === WIZARD_STEPS.WHAT_TO_DO) {
            setOutcome(OUTCOMES.SOMEDAY_MAYBE);
            goToStep(WIZARD_STEPS.ADD_DETAILS);
          } else if (currentStep === WIZARD_STEPS.NON_ACTIONABLE) {
            setOutcome(OUTCOMES.SOMEDAY_MAYBE);
            goToStep(WIZARD_STEPS.ADD_DETAILS);
          } else if (currentStep === WIZARD_STEPS.SINGLE_OR_PROJECT && activeProjects.length > 0) {
            setOutcome(OUTCOMES.NEXT_ACTION);
            goToStep(WIZARD_STEPS.ADD_TO_PROJECT);
          }
          break;

        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, onSkip, goToStep, goBack, handleSubmit, activeProjects.length]);

  // Render step content
  const renderStepContent = useMemo(() => {
    switch (currentStep) {
      case WIZARD_STEPS.ACTIONABLE:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Is this actionable?</h3>
              <p className="text-gray-600">
                Can you take action on this, or is it just information?
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-lg font-medium text-gray-900">{task?.title}</p>
              {task?.notes && (
                <p className="text-sm text-gray-500 mt-1">{task.notes}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => goToStep(WIZARD_STEPS.TWO_MINUTE)}
                className="p-4 bg-green-50 border-2 border-green-200 rounded-xl hover:border-green-400 hover:bg-green-100 transition-all group"
              >
                <div className="w-10 h-10 bg-green-100 group-hover:bg-green-200 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="font-medium text-green-700">Yes</span>
                <p className="text-xs text-green-600 mt-1">I can take action</p>
              </button>

              <button
                onClick={() => goToStep(WIZARD_STEPS.NON_ACTIONABLE)}
                className="p-4 bg-gray-50 border-2 border-gray-200 rounded-xl hover:border-gray-400 hover:bg-gray-100 transition-all group"
              >
                <div className="w-10 h-10 bg-gray-100 group-hover:bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <span className="font-medium text-gray-700">No</span>
                <p className="text-xs text-gray-600 mt-1">It's not actionable</p>
              </button>
            </div>
          </div>
        );

      case WIZARD_STEPS.TWO_MINUTE:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Will it take less than 2 minutes?</h3>
              <p className="text-gray-600">
                If so, do it right now. Don't defer quick tasks.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => goToStep(WIZARD_STEPS.DO_IT_NOW)}
                className="p-4 bg-green-50 border-2 border-green-200 rounded-xl hover:border-green-400 hover:bg-green-100 transition-all"
              >
                <span className="font-medium text-green-700">Yes, under 2 min</span>
                <p className="text-xs text-green-600 mt-1">Do it now!</p>
              </button>

              <button
                onClick={() => goToStep(WIZARD_STEPS.SINGLE_OR_PROJECT)}
                className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-100 transition-all"
              >
                <span className="font-medium text-blue-700">No, longer</span>
                <p className="text-xs text-blue-600 mt-1">Needs more time</p>
              </button>
            </div>
          </div>
        );

      case WIZARD_STEPS.DO_IT_NOW:
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Do it now!</h3>
              <p className="text-gray-600">Complete this task within 2 minutes</p>
            </div>

            <TwoMinuteTimer
              autoStart={true}
              onComplete={() => handleSubmit(OUTCOMES.COMPLETE_NOW)}
              onCancel={() => goToStep(WIZARD_STEPS.SINGLE_OR_PROJECT)}
            />
          </div>
        );

      case WIZARD_STEPS.SINGLE_OR_PROJECT:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Single action or project?</h3>
              <p className="text-gray-600">
                Does this require multiple steps to complete?
              </p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => goToStep(WIZARD_STEPS.WHAT_TO_DO)}
                  className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-100 transition-all"
                >
                  <span className="font-medium text-blue-700">Single Action</span>
                  <p className="text-xs text-blue-600 mt-1">One step to complete</p>
                </button>

                <button
                  onClick={() => {
                    setOutcome(OUTCOMES.PROJECT);
                    goToStep(WIZARD_STEPS.CREATE_PROJECT);
                  }}
                  className="p-4 bg-purple-50 border-2 border-purple-200 rounded-xl hover:border-purple-400 hover:bg-purple-100 transition-all"
                >
                  <span className="font-medium text-purple-700">Project</span>
                  <p className="text-xs text-purple-600 mt-1">Multiple steps needed</p>
                </button>
              </div>

              {/* P6-004: Add to existing project option */}
              {activeProjects.length > 0 && (
                <button
                  onClick={() => {
                    setOutcome(OUTCOMES.NEXT_ACTION);
                    goToStep(WIZARD_STEPS.ADD_TO_PROJECT);
                  }}
                  className="w-full p-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-100 transition-all text-left"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div>
                      <span className="font-medium text-indigo-700">Add to Project</span>
                      <p className="text-xs text-indigo-600">Add as next action to existing project</p>
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>
        );

      case WIZARD_STEPS.WHAT_TO_DO:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">What should happen next?</h3>
              <p className="text-gray-600">Choose how to handle this action</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setOutcome(OUTCOMES.NEXT_ACTION);
                  goToStep(WIZARD_STEPS.ADD_DETAILS);
                }}
                className="w-full p-4 bg-blue-50 border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-100 transition-all text-left"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Do it myself</span>
                    <p className="text-xs text-blue-600">Add to Next Actions</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setOutcome(OUTCOMES.WAITING_FOR);
                  goToStep(WIZARD_STEPS.ADD_DETAILS);
                }}
                className="w-full p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl hover:border-yellow-400 hover:bg-yellow-100 transition-all text-left"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-medium text-yellow-700">Delegate it</span>
                    <p className="text-xs text-yellow-600">Add to Waiting For</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setOutcome(OUTCOMES.SOMEDAY_MAYBE);
                  goToStep(WIZARD_STEPS.ADD_DETAILS);
                }}
                className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-xl hover:border-gray-400 hover:bg-gray-100 transition-all text-left"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Maybe later</span>
                    <p className="text-xs text-gray-600">Add to Someday/Maybe</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        );

      case WIZARD_STEPS.NON_ACTIONABLE:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">What is this?</h3>
              <p className="text-gray-600">Choose what to do with non-actionable items</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleSubmit(OUTCOMES.TRASH)}
                className="w-full p-4 bg-red-50 border-2 border-red-200 rounded-xl hover:border-red-400 hover:bg-red-100 transition-all text-left"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-medium text-red-700">Trash it</span>
                    <p className="text-xs text-red-600">Delete permanently</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setOutcome(OUTCOMES.REFERENCE);
                  goToStep(WIZARD_STEPS.ADD_DETAILS);
                }}
                className="w-full p-4 bg-blue-50 border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-100 transition-all text-left"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Reference</span>
                    <p className="text-xs text-blue-600">Keep for future reference</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setOutcome(OUTCOMES.SOMEDAY_MAYBE);
                  goToStep(WIZARD_STEPS.ADD_DETAILS);
                }}
                className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-xl hover:border-gray-400 hover:bg-gray-100 transition-all text-left"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Someday/Maybe</span>
                    <p className="text-xs text-gray-600">Incubate for later review</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        );

      case WIZARD_STEPS.ADD_DETAILS:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Add Details</h3>
              <p className="text-gray-600">Optional: Add more context to your task</p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="wizard-notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  id="wizard-notes"
                  value={formData.notes}
                  onChange={(e) => updateForm('notes', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Add any relevant details..."
                />
              </div>

              {outcome === OUTCOMES.NEXT_ACTION && (
                <>
                  <fieldset>
                    <legend className="block text-sm font-medium text-gray-700 mb-2">
                      Energy Level
                    </legend>
                    <div className="flex space-x-2">
                      {['low', 'medium', 'high'].map((level) => (
                        <button
                          key={level}
                          onClick={() => updateForm('energyLevel', level)}
                          className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all capitalize ${
                            formData.energyLevel === level
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <div>
                    <label htmlFor="wizard-time-estimate" className="block text-sm font-medium text-gray-700 mb-1">
                      Time Estimate
                    </label>
                    <select
                      id="wizard-time-estimate"
                      value={formData.timeEstimate || ''}
                      onChange={(e) => updateForm('timeEstimate', e.target.value ? Number.parseInt(e.target.value, 10) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      <option value="5">5 minutes</option>
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="120">2 hours</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="wizard-due-date" className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date (optional)
                    </label>
                    <input
                      id="wizard-due-date"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => updateForm('dueDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              {outcome === OUTCOMES.WAITING_FOR && (
                <div>
                  <label htmlFor="wizard-waiting-for" className="block text-sm font-medium text-gray-700 mb-1">
                    Waiting for whom?
                  </label>
                  <input
                    id="wizard-waiting-for"
                    type="text"
                    value={formData.waitingForPerson}
                    onChange={(e) => updateForm('waitingForPerson', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Person or team name"
                  />
                </div>
              )}

              {/* P6-001/P6-002: Context selection for NEXT_ACTION */}
              {outcome === OUTCOMES.NEXT_ACTION && contexts.length > 0 && (
                <fieldset>
                  <legend className="block text-sm font-medium text-gray-700 mb-2">
                    Contexts
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {contexts.map((context) => (
                      <label
                        key={context.id}
                        className={`inline-flex items-center px-3 py-1.5 rounded-full border-2 cursor-pointer transition-all ${
                          formData.selectedContexts.includes(context.id)
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={formData.selectedContexts.includes(context.id)}
                          onChange={() => toggleContext(context.id)}
                          aria-label={context.name}
                        />
                        <span className="text-sm">{context.name}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => goToStep(WIZARD_STEPS.ACTIONABLE)}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Start Over
              </button>
              <button
                onClick={() => handleSubmit()}
                disabled={isClarifying}
                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isClarifying ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        );

      case WIZARD_STEPS.CREATE_PROJECT:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Create Project</h3>
              <p className="text-gray-600">Define your project outcome</p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="wizard-project-title" className="block text-sm font-medium text-gray-700 mb-1">
                  Project Title
                </label>
                <input
                  id="wizard-project-title"
                  type="text"
                  value={formData.projectTitle}
                  onChange={(e) => updateForm('projectTitle', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="What's the desired outcome?"
                />
              </div>

              <div>
                <label htmlFor="wizard-project-outcome" className="block text-sm font-medium text-gray-700 mb-1">
                  Success Looks Like...
                </label>
                <textarea
                  id="wizard-project-outcome"
                  value={formData.projectOutcome}
                  onChange={(e) => updateForm('projectOutcome', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describe what success looks like when this project is complete"
                />
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => goToStep(WIZARD_STEPS.SINGLE_OR_PROJECT)}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => handleSubmit()}
                disabled={isClarifying || !formData.projectTitle.trim()}
                className="flex-1 py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {isClarifying ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        );

      case WIZARD_STEPS.ADD_TO_PROJECT:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Add to Existing Project</h3>
              <p className="text-gray-600">Select a project to add this task to</p>
            </div>

            <div className="space-y-4">
              <ProjectSelector
                onSelect={(projectId) => updateForm('selectedProjectId', projectId)}
                selectedProjectId={formData.selectedProjectId}
                label="Add to project"
              />

              <div>
                <label htmlFor="wizard-notes-project" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  id="wizard-notes-project"
                  value={formData.notes}
                  onChange={(e) => updateForm('notes', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={2}
                  placeholder="Add any relevant details..."
                />
              </div>

              {/* Context selection for project tasks */}
              {contexts.length > 0 && (
                <fieldset>
                  <legend className="block text-sm font-medium text-gray-700 mb-2">
                    Contexts
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {contexts.map((context) => (
                      <label
                        key={context.id}
                        className={`inline-flex items-center px-3 py-1.5 rounded-full border-2 cursor-pointer transition-all ${
                          formData.selectedContexts.includes(context.id)
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={formData.selectedContexts.includes(context.id)}
                          onChange={() => toggleContext(context.id)}
                          aria-label={context.name}
                        />
                        <span className="text-sm">{context.name}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => goToStep(WIZARD_STEPS.SINGLE_OR_PROJECT)}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => handleSubmit()}
                disabled={isClarifying || !formData.selectedProjectId}
                className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isClarifying ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  }, [currentStep, task, formData, outcome, isClarifying, contexts, goToStep, updateForm, toggleContext, handleSubmit]);

  return (
    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-auto overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-white">Clarify Task</h2>
          {onSkip && (
            <button
              onClick={onSkip}
              className="text-blue-200 hover:text-white transition-colors text-sm"
            >
              Skip
            </button>
          )}
        </div>
        <p className="text-white font-medium text-base truncate pr-2" title={task?.title}>
          {task?.title}
        </p>
      </div>

      {/* Content */}
      <div className="p-6">
        {renderStepContent}
      </div>
    </div>
  );
};

ClarifyWizard.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    notes: PropTypes.string,
  }).isRequired,
  onComplete: PropTypes.func.isRequired,
  onSkip: PropTypes.func,
};

export default ClarifyWizard;
