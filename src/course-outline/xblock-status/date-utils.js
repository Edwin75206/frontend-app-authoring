import { getStudioTimezone, getStudioTimezoneLabel } from '../../utils';

const DATE_TIME_FORMAT_OPTIONS = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
};

/**
 * Format a stored UTC instant for display in the institutional Studio timezone.
 * Preserve the API-provided display text when the instant cannot be formatted.
 */
export const formatDateForStudioTimezone = (isoDate, fallbackText) => {
  if (!isoDate) {
    return fallbackText;
  }

  const instant = new Date(isoDate);
  if (Number.isNaN(instant.getTime())) {
    return fallbackText;
  }

  try {
    const formattedDate = new Intl.DateTimeFormat('en-GB', {
      ...DATE_TIME_FORMAT_OPTIONS,
      timeZone: getStudioTimezone(),
    }).format(instant);
    return `${formattedDate} ${getStudioTimezoneLabel()}`;
  } catch (error) {
    return fallbackText;
  }
};
