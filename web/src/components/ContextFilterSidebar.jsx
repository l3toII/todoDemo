import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import {
  fetchContexts,
  selectAllContexts,
  selectContextsLoading,
} from '../features/contexts/contextsSlice';

const ContextFilterSidebar = ({ selectedContextId, onContextSelect, taskCounts = {} }) => {
  const dispatch = useDispatch();
  const contexts = useSelector(selectAllContexts);
  const isLoading = useSelector(selectContextsLoading);
  const [isExpanded, setIsExpanded] = useState(true);

  // Fetch contexts on mount if not already loaded
  useEffect(() => {
    dispatch(fetchContexts());
  }, [dispatch]);

  // Calculate total task count
  const totalTaskCount = Object.values(taskCounts).reduce((sum, count) => sum + count, 0);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleContextClick = (contextId) => {
    onContextSelect(contextId);
  };

  const handleAllClick = () => {
    onContextSelect(null);
  };

  return (
    <aside
      data-testid="context-sidebar"
      data-expanded={isExpanded}
      className={`bg-white border-r border-gray-200 transition-all duration-300 ${
        isExpanded ? 'w-64' : 'w-16'
      }`}
    >
      {/* Header with toggle */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {isExpanded && (
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Contexts
          </h2>
        )}
        <button
          onClick={handleToggle}
          className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          aria-label="Toggle sidebar"
        >
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded ? '' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Loading State */}
      {isLoading && contexts.length === 0 && (
        <div className="p-4 text-center text-gray-500 text-sm">
          Loading contexts...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && contexts.length === 0 && (
        <div className="p-4 text-center text-gray-500 text-sm">
          No contexts available
        </div>
      )}

      {/* Context List */}
      {contexts.length > 0 && (
        <nav className="p-2">
          {/* All Contexts Option */}
          <button
            onClick={handleAllClick}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              selectedContextId === null
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            aria-label="All Contexts"
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              {isExpanded && <span>All Contexts</span>}
            </div>
            {isExpanded && (
              <span
                data-testid="all-contexts-count"
                className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full"
              >
                {totalTaskCount}
              </span>
            )}
          </button>

          {/* Context Items */}
          <div className="mt-2 space-y-1">
            {contexts.map((context) => {
              const count = taskCounts[context.id] || 0;
              const isSelected = selectedContextId === context.id;

              return (
                <button
                  key={context.id}
                  onClick={() => handleContextClick(context.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  aria-label={context.name}
                >
                  <div className="flex items-center gap-2">
                    <div
                      data-testid={`filter-color-${context.id}`}
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: context.color || '#6B7280' }}
                    />
                    {isExpanded && <span>{context.name}</span>}
                  </div>
                  {isExpanded && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </aside>
  );
};

ContextFilterSidebar.propTypes = {
  selectedContextId: PropTypes.string,
  onContextSelect: PropTypes.func.isRequired,
  taskCounts: PropTypes.objectOf(PropTypes.number),
};

export default ContextFilterSidebar;
