import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  fetchProfile,
  updatePreferences,
  selectProfile,
  selectAccountLoading,
  selectAccountSaving,
  selectAccountError,
  selectSuccessMessage,
  clearError,
  clearSuccessMessage,
} from '../features/account/accountSlice';
import TimezoneSelector from '../components/TimezoneSelector';
import NotificationPreferences from '../components/NotificationPreferences';

const AccountSettingsPage = () => {
  const dispatch = useDispatch();
  const profile = useSelector(selectProfile);
  const isLoading = useSelector(selectAccountLoading);
  const isSaving = useSelector(selectAccountSaving);
  const error = useSelector(selectAccountError);
  const successMessage = useSelector(selectSuccessMessage);

  const [timezone, setTimezone] = useState('UTC');
  const [notificationPreferences, setNotificationPreferences] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch profile on mount
  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  // Update local state when profile loads
  useEffect(() => {
    if (profile) {
      setTimezone(profile.timezone || 'UTC');
      setNotificationPreferences(profile.notification_preferences || {});
      setHasChanges(false);
    }
  }, [profile]);

  // Clear messages on unmount
  useEffect(() => {
    return () => {
      dispatch(clearError());
      dispatch(clearSuccessMessage());
    };
  }, [dispatch]);

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        dispatch(clearSuccessMessage());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, dispatch]);

  const handleTimezoneChange = (newTimezone) => {
    setTimezone(newTimezone);
    setHasChanges(true);
  };

  const handleNotificationChange = (newPreferences) => {
    setNotificationPreferences(newPreferences);
    setHasChanges(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    dispatch(clearError());

    try {
      await dispatch(updatePreferences({
        timezone,
        notification_preferences: notificationPreferences,
      })).unwrap();
      setHasChanges(false);
    } catch {
      // Error is handled in the slice
    }
  };

  const handleReset = () => {
    if (profile) {
      setTimezone(profile.timezone || 'UTC');
      setNotificationPreferences(profile.notification_preferences || {});
      setHasChanges(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account preferences and notification settings
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 rounded-md bg-green-50 p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Profile Information */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">{profile?.email || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Account Status</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  profile?.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {profile?.status || 'N/A'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Member Since</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(profile?.created_at)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Email Verified</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {profile?.verified_at ? formatDate(profile.verified_at) : 'Not verified'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Preferences Form */}
      <form onSubmit={handleSave}>
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6 space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Preferences</h2>

            <TimezoneSelector
              value={timezone}
              onChange={handleTimezoneChange}
              disabled={isSaving}
            />

            <div className="border-t border-gray-200 pt-6">
              <NotificationPreferences
                value={notificationPreferences}
                onChange={handleNotificationChange}
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6 rounded-b-lg">
            <button
              type="button"
              onClick={handleReset}
              disabled={!hasChanges || isSaving}
              className="mr-3 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={!hasChanges || isSaving}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="bg-white shadow rounded-lg border border-red-200">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-red-600 mb-2">Danger Zone</h2>
          <p className="text-sm text-gray-500 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <Link
            to="/account/delete"
            className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AccountSettingsPage;
