import { getConfig, getPath } from '@edx/frontend-platform';

import {
  getFileSizeToClosestByte,
  createCorrectInternalRoute,
  convertToDateFromString,
  convertToStringFromDate,
  getStudioTimezone,
  getStudioTimezoneLabel,
  getTimezoneOffsetMs,
} from './utils';

jest.mock('@edx/frontend-platform', () => ({
  getConfig: jest.fn(),
  ensureConfig: jest.fn(),
  getPath: jest.fn(),
}));

describe('FilesAndUploads utils', () => {
  describe('getFileSizeToClosestByte', () => {
    it('should return file size with B for bytes', () => {
      const expectedSize = '219.00 B';
      const actualSize = getFileSizeToClosestByte(219);
      expect(expectedSize).toEqual(actualSize);
    });
    it('should return file size with KB for kilobytes', () => {
      const expectedSize = '21.90 KB';
      const actualSize = getFileSizeToClosestByte(21900);
      expect(expectedSize).toEqual(actualSize);
    });
    it('should return file size with MB for megabytes', () => {
      const expectedSize = '2.19 MB';
      const actualSize = getFileSizeToClosestByte(2190000);
      expect(expectedSize).toEqual(actualSize);
    });
    it('should return file size with GB for gigabytes', () => {
      const expectedSize = '2.03 GB';
      const actualSize = getFileSizeToClosestByte(2034190000);
      expect(expectedSize).toEqual(actualSize);
    });
    it('should return file size with TB for terabytes', () => {
      const expectedSize = '1.99 TB';
      const actualSize = getFileSizeToClosestByte(1988034190000);
      expect(expectedSize).toEqual(actualSize);
    });
    it('should return file size with TB for larger numbers', () => {
      const expectedSize = '1234.56 TB';
      const actualSize = getFileSizeToClosestByte(1234560000000000);
      expect(expectedSize).toEqual(actualSize);
    });
  });
  describe('createCorrectInternalRoute', () => {
    beforeEach(() => {
      getConfig.mockReset();
      getPath.mockReset();
    });

    it('returns the correct internal route when checkPath is not prefixed with basePath', () => {
      getConfig.mockReturnValue({ PUBLIC_PATH: 'example.com' });
      getPath.mockReturnValue('/');

      const checkPath = '/some/path';
      const result = createCorrectInternalRoute(checkPath);

      expect(result).toBe('/some/path');
    });

    it('returns the input checkPath when it is already prefixed with basePath', () => {
      getConfig.mockReturnValue({ PUBLIC_PATH: 'example.com' });
      getPath.mockReturnValue('/course-authoring');

      const checkPath = '/course-authoring/some/path';
      const result = createCorrectInternalRoute(checkPath);

      expect(result).toBe('/course-authoring/some/path');
    });

    it('handles basePath ending with a slash correctly', () => {
      getConfig.mockReturnValue({ PUBLIC_PATH: 'example.com/' });
      getPath.mockReturnValue('/course-authoring/');

      const checkPath = '/some/path';
      const result = createCorrectInternalRoute(checkPath);

      expect(result).toBe('/course-authoring/some/path');
    });
  });
});

describe('Studio timezone date conversion', () => {
  // The jest suite runs with TZ=UTC (see package.json), so a Date built with the
  // local constructor `new Date(y, m, d, h, mi)` is what react-datepicker hands us
  // when the user picks that wall-clock time.
  const MX = 'America/Mexico_City';

  afterEach(() => {
    getConfig.mockReset();
  });

  describe('configuration helpers', () => {
    it('defaults to UTC when STUDIO_TIMEZONE is not configured', () => {
      getConfig.mockReturnValue({});
      expect(getStudioTimezone()).toBe('UTC');
      expect(getStudioTimezoneLabel()).toBe('UTC');
    });

    it('reads STUDIO_TIMEZONE and STUDIO_TIMEZONE_LABEL from config', () => {
      getConfig.mockReturnValue({ STUDIO_TIMEZONE: MX, STUDIO_TIMEZONE_LABEL: 'Hora de Ciudad de México' });
      expect(getStudioTimezone()).toBe(MX);
      expect(getStudioTimezoneLabel()).toBe('Hora de Ciudad de México');
    });

    it('falls back to the IANA id when no label is configured', () => {
      getConfig.mockReturnValue({ STUDIO_TIMEZONE: MX });
      expect(getStudioTimezoneLabel()).toBe(MX);
    });
  });

  describe('getTimezoneOffsetMs', () => {
    it('is 0 for UTC', () => {
      expect(getTimezoneOffsetMs(new Date('2026-08-27T10:00:00Z'), 'UTC')).toBe(0);
    });

    it('is -6h for America/Mexico_City in 2026 (no DST)', () => {
      const hours = getTimezoneOffsetMs(new Date('2026-08-27T10:00:00Z'), MX) / 3600000;
      expect(hours).toBe(-6);
    });

    it('is computed per-instant, not hardcoded (America/New_York DST)', () => {
      const janOffset = getTimezoneOffsetMs(new Date('2026-01-15T12:00:00Z'), 'America/New_York') / 3600000;
      const julOffset = getTimezoneOffsetMs(new Date('2026-07-15T12:00:00Z'), 'America/New_York') / 3600000;
      expect(janOffset).toBe(-5); // EST
      expect(julOffset).toBe(-4); // EDT
    });
  });

  describe('convertToStringFromDate - picker (institutional time) -> UTC string', () => {
    beforeEach(() => {
      getConfig.mockReturnValue({ STUDIO_TIMEZONE: MX });
    });

    it('2026-08-27 10:00 America/Mexico_City -> 2026-08-27T16:00:00Z', () => {
      expect(convertToStringFromDate(new Date(2026, 7, 27, 10, 0, 0)))
        .toBe('2026-08-27T16:00:00Z');
    });

    it('2026-08-27 00:00 America/Mexico_City (midnight) -> 2026-08-27T06:00:00Z', () => {
      expect(convertToStringFromDate(new Date(2026, 7, 27, 0, 0, 0)))
        .toBe('2026-08-27T06:00:00Z');
    });

    it('2026-08-27 23:30 America/Mexico_City rolls over to the next UTC day -> 2026-08-28T05:30:00Z', () => {
      expect(convertToStringFromDate(new Date(2026, 7, 27, 23, 30, 0)))
        .toBe('2026-08-28T05:30:00Z');
    });

    it('course start 2026-08-01 00:00 MX -> 2026-08-01T06:00:00Z', () => {
      expect(convertToStringFromDate(new Date(2026, 7, 1, 0, 0, 0)))
        .toBe('2026-08-01T06:00:00Z');
    });

    it('course end 2026-12-31 23:59 MX rolls into 2027 UTC -> 2027-01-01T05:59:00Z', () => {
      expect(convertToStringFromDate(new Date(2026, 11, 31, 23, 59, 0)))
        .toBe('2027-01-01T05:59:00Z');
    });

    it('returns empty string for falsy and "Invalid date" for an invalid Date', () => {
      expect(convertToStringFromDate(null)).toBe('');
      expect(convertToStringFromDate(new Date('nonsense'))).toBe('Invalid date');
    });
  });

  describe('convertToDateFromString - stored UTC string -> picker (institutional time)', () => {
    beforeEach(() => {
      getConfig.mockReturnValue({ STUDIO_TIMEZONE: MX });
    });

    it('2026-08-27T16:00:00Z -> picker shows 2026-08-27 10:00', () => {
      const date = convertToDateFromString('2026-08-27T16:00:00Z');
      expect([
        date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(),
      ]).toEqual([2026, 7, 27, 10, 0]);
    });

    it('2026-08-28T05:30:00Z -> picker shows previous day 2026-08-27 23:30', () => {
      const date = convertToDateFromString('2026-08-28T05:30:00Z');
      expect([
        date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(),
      ]).toEqual([2026, 7, 27, 23, 30]);
    });

    it('keeps historical timezone-free parsing for date-only strings (course updates)', () => {
      const date = convertToDateFromString('August 27, 2026');
      expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 7, 27]);
    });

    it('returns empty string for falsy input', () => {
      expect(convertToDateFromString('')).toBe('');
      expect(convertToDateFromString(null)).toBe('');
    });
  });

  describe('round-trip UTC -> picker -> UTC is loss-free', () => {
    beforeEach(() => {
      getConfig.mockReturnValue({ STUDIO_TIMEZONE: MX });
    });

    it.each([
      '2026-08-27T16:00:00Z',
      '2026-08-27T06:00:00Z',
      '2026-08-28T05:30:00Z',
      '2026-01-01T00:00:00Z',
      '2026-12-31T23:59:00Z',
      '2027-01-01T05:59:00Z',
    ])('%s', (stored) => {
      expect(convertToStringFromDate(convertToDateFromString(stored))).toBe(stored);
    });
  });

  describe('UTC fallback preserves upstream behaviour', () => {
    beforeEach(() => {
      getConfig.mockReturnValue({ STUDIO_TIMEZONE: 'UTC' });
    });

    it('does not shift the wall-clock time', () => {
      expect(convertToStringFromDate(new Date(2026, 7, 27, 10, 0, 0)))
        .toBe('2026-08-27T10:00:00Z');
      const date = convertToDateFromString('2026-08-27T10:00:00Z');
      expect([date.getHours(), date.getMinutes()]).toEqual([10, 0]);
    });
  });
});
