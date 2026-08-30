import { getConfig } from '@edx/frontend-platform';

import { formatDateForStudioTimezone } from './date-utils';

jest.mock('@edx/frontend-platform', () => ({
  getConfig: jest.fn(),
  ensureConfig: jest.fn(),
  getPath: jest.fn(),
}));

describe('formatDateForStudioTimezone', () => {
  const timezone = 'America/Mexico_City';
  const timezoneLabel = 'Hora de la Ciudad de México';
  const fallbackText = 'Aug 27, 2026 at 13:00 UTC';

  beforeEach(() => {
    getConfig.mockReturnValue({
      STUDIO_TIMEZONE: timezone,
      STUDIO_TIMEZONE_LABEL: timezoneLabel,
    });
  });

  afterEach(() => {
    getConfig.mockReset();
  });

  it.each([
    ['2026-08-27T13:00:00Z', `27 Aug 2026, 07:00 ${timezoneLabel}`],
    ['2026-08-28T01:00:00Z', `27 Aug 2026, 19:00 ${timezoneLabel}`],
    ['2026-08-28T05:30:00Z', `27 Aug 2026, 23:30 ${timezoneLabel}`],
  ])('formats %s in the configured Studio timezone', (isoDate, expected) => {
    const originalTimestamp = Date.parse(isoDate);
    expect(formatDateForStudioTimezone(isoDate, fallbackText)).toBe(expected);
    expect(Date.parse(isoDate)).toBe(originalTimestamp);
  });

  it('falls back when the ISO instant is null', () => {
    expect(formatDateForStudioTimezone(null, fallbackText)).toBe(fallbackText);
  });

  it('falls back when the ISO instant is empty', () => {
    expect(formatDateForStudioTimezone('', fallbackText)).toBe(fallbackText);
  });

  it('falls back when the ISO instant is invalid', () => {
    expect(formatDateForStudioTimezone('not-a-date', fallbackText)).toBe(fallbackText);
  });

  it('falls back when the configured timezone cannot be formatted', () => {
    getConfig.mockReturnValue({
      STUDIO_TIMEZONE: 'Invalid/Timezone',
      STUDIO_TIMEZONE_LABEL: timezoneLabel,
    });
    expect(formatDateForStudioTimezone('2026-08-27T13:00:00Z', fallbackText)).toBe(fallbackText);
  });
});
