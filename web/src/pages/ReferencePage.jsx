import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchReference,
  deleteTask,
  selectReference,
  selectTasksLoading,
  selectTasksError,
  clearError,
} from '../features/tasks/tasksSlice';
import ErrorAlert from '../components/ErrorAlert';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import TaskList from '../components/TaskList';
import TaskContextBadges from '../components/TaskContextBadges';
import useAutoCleanError from '../hooks/useAutoCleanError';

const ReferencePage = () => {
  const dispatch = useDispatch();
  const items = useSelector(selectReference);
  const isLoading = useSelector(selectTasksLoading);
  const error = useSelector(selectTasksError);

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    dispatch(fetchReference());
  }, [dispatch]);

  useAutoCleanError(error);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return items;
    }
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.notes?.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const handleDeleteItem = async (itemId) => {
    try {
      await dispatch(deleteTask(itemId)).unwrap();
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const handleRefresh = () => {
    dispatch(fetchReference());
  };

  const emptyIcon = (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Reference"
        description="Non-actionable information for later"
        count={filteredItems.length}
        countColor="gray"
        onRefresh={handleRefresh}
      />

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search reference items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <ErrorAlert message={error} onDismiss={() => dispatch(clearError())} />

      {isLoading && items.length === 0 && (
        <LoadingState message="Loading reference items..." color="gray" />
      )}

      {!isLoading && filteredItems.length === 0 && (
        <EmptyState
          icon={emptyIcon}
          title="No Reference Items"
          message={searchQuery
            ? 'No items match your search.'
            : 'Store important information here for easy access.'}
        />
      )}

      <TaskList>
        {filteredItems.map((item) => (
          <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0 w-5 h-5 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 break-words">
                  {item.title}
                </p>
                {item.notes && (
                  <p className="mt-1 text-sm text-gray-500 break-words line-clamp-2">
                    {item.notes}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <TaskContextBadges contexts={item.contexts} />

                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                    Added {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleDeleteItem(item.id)}
                className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                aria-label={`Delete "${item.title}"`}
                title="Delete item"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </TaskList>
    </div>
  );
};

export default ReferencePage;
