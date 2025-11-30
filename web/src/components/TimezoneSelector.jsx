import { useMemo } from 'react';

// Common timezones grouped by region
const TIMEZONE_GROUPS = {
  'America': [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Anchorage',
    'America/Toronto',
    'America/Vancouver',
    'America/Mexico_City',
    'America/Sao_Paulo',
    'America/Buenos_Aires',
  ],
  'Europe': [
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Rome',
    'Europe/Madrid',
    'Europe/Amsterdam',
    'Europe/Brussels',
    'Europe/Zurich',
    'Europe/Stockholm',
    'Europe/Moscow',
  ],
  'Asia': [
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Asia/Singapore',
    'Asia/Seoul',
    'Asia/Dubai',
    'Asia/Mumbai',
    'Asia/Bangkok',
    'Asia/Jakarta',
    'Asia/Manila',
  ],
  'Pacific': [
    'Pacific/Auckland',
    'Pacific/Sydney',
    'Australia/Melbourne',
    'Australia/Brisbane',
    'Pacific/Honolulu',
    'Pacific/Fiji',
  ],
  'Africa': [
    'Africa/Cairo',
    'Africa/Johannesburg',
    'Africa/Lagos',
    'Africa/Nairobi',
  ],
  'Other': [
    'UTC',
  ],
};

const formatTimezone = (tz) => {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const offset = parts.find(p => p.type === 'timeZoneName')?.value || '';
    const cityName = tz.split('/').pop().replace(/_/g, ' ');
    return `${cityName} (${offset})`;
  } catch {
    return tz;
  }
};

const TimezoneSelector = ({ value, onChange, disabled = false, error }) => {
  const timezoneOptions = useMemo(() => {
    const options = [];
    Object.entries(TIMEZONE_GROUPS).forEach(([region, timezones]) => {
      timezones.forEach(tz => {
        options.push({
          value: tz,
          label: formatTimezone(tz),
          region,
        });
      });
    });
    return options;
  }, []);

  return (
    <div>
      <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
        Timezone
      </label>
      <select
        id="timezone"
        name="timezone"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      >
        {Object.entries(TIMEZONE_GROUPS).map(([region, timezones]) => (
          <optgroup key={region} label={region}>
            {timezones.map(tz => {
              const option = timezoneOptions.find(o => o.value === tz);
              return (
                <option key={tz} value={tz}>
                  {option?.label || tz}
                </option>
              );
            })}
          </optgroup>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      <p className="mt-1 text-xs text-gray-500">
        Used for displaying dates and scheduling reminders
      </p>
    </div>
  );
};

export default TimezoneSelector;
