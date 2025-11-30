const NOTIFICATION_OPTIONS = [
  {
    id: 'email_weekly_review',
    label: 'Weekly Review Reminder',
    description: 'Receive an email reminder for your weekly review',
  },
  {
    id: 'email_deadline_reminder',
    label: 'Deadline Reminders',
    description: 'Get notified about upcoming task deadlines',
  },
  {
    id: 'email_inbox_overflow',
    label: 'Inbox Overflow Alert',
    description: 'Alert when your inbox has too many unprocessed items',
  },
];

const NotificationPreferences = ({ value = {}, onChange, disabled = false }) => {
  const handleToggle = (optionId) => {
    onChange({
      ...value,
      [optionId]: !value[optionId],
    });
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Email Notifications
      </label>
      <div className="space-y-4">
        {NOTIFICATION_OPTIONS.map((option) => (
          <div key={option.id} className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id={option.id}
                name={option.id}
                type="checkbox"
                checked={value[option.id] || false}
                onChange={() => handleToggle(option.id)}
                disabled={disabled}
                className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
                  disabled ? 'cursor-not-allowed opacity-50' : ''
                }`}
              />
            </div>
            <div className="ml-3">
              <label
                htmlFor={option.id}
                className={`text-sm font-medium ${
                  disabled ? 'text-gray-400' : 'text-gray-700'
                }`}
              >
                {option.label}
              </label>
              <p className="text-xs text-gray-500">{option.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationPreferences;
