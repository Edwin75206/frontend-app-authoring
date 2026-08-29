import { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useMediaQuery } from 'react-responsive';
import * as Yup from 'yup';
import { snakeCase } from 'lodash/string';
import moment from 'moment';
import { getConfig, getPath } from '@edx/frontend-platform';

import { RequestStatus } from './data/constants';
import { getCourseAppSettingValue, getLoadingStatus } from './pages-and-resources/data/selectors';
import { fetchCourseAppSettings, updateCourseAppSetting } from './pages-and-resources/data/thunks';
import { PagesAndResourcesContext } from './pages-and-resources/PagesAndResourcesProvider';
import {
  hasValidDateFormat, hasValidTimeFormat, decodeDateTime, endOfDayTime, startOfDayTime,
} from './pages-and-resources/discussions/app-config-form/utils';
import { DATE_TIME_FORMAT } from './constants';

export const executeThunk = async (thunk, dispatch, getState) => {
  await thunk(dispatch, getState);
  await new Promise(setImmediate);
};

export function useIsMobile() {
  return useMediaQuery({ query: '(max-width: 767.98px)' });
}

export function useIsDesktop() {
  return useMediaQuery({ query: '(min-width: 992px)' });
}

export function convertObjectToSnakeCase(obj, unpacked = false) {
  return Object.keys(obj).reduce((snakeCaseObj, key) => {
    const snakeCaseKey = snakeCase(key);
    const value = unpacked ? obj[key] : { value: obj[key] };
    return {
      ...snakeCaseObj,
      [snakeCaseKey]: value,
    };
  }, {});
}

export function deepConvertingKeysToCamelCase(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepConvertingKeysToCamelCase(item));
  }

  const camelCaseObj = {};
  Object.keys(obj).forEach((key) => {
    const camelCaseKey = key.replace(/_([a-z])/g, (match, p1) => p1.toUpperCase());
    camelCaseObj[camelCaseKey] = deepConvertingKeysToCamelCase(obj[key]);
  });
  return camelCaseObj;
}

export function deepConvertingKeysToSnakeCase(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepConvertingKeysToSnakeCase(item));
  }

  const snakeCaseObj = {};
  Object.entries(obj).forEach(([key, value]) => {
    const snakeCaseKey = key.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    snakeCaseObj[snakeCaseKey] = key === 'gradeCutoffs' ? value : deepConvertingKeysToSnakeCase(value);
  });
  return snakeCaseObj;
}

export function transformKeysToCamelCase(obj) {
  return obj.key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

export function parseArrayOrObjectValues(obj) {
  const result = {};

  Object.entries(obj).forEach(([key, value]) => {
    try {
      if (!Number.isNaN(Number(value))) {
        result[key] = value;
      } else {
        result[key] = JSON.parse(value);
      }
    } catch (e) {
      result[key] = value;
    }
  });

  return result;
}

/**
 * Create a correct inner path depend on config PUBLIC_PATH.
 * @param {string} checkPath - the internal route path that is validated
 * @returns {string} - the correct internal route path
 */
export const createCorrectInternalRoute = (checkPath) => {
  let basePath = getPath(getConfig().PUBLIC_PATH);

  if (basePath.endsWith('/')) {
    basePath = basePath.slice(0, -1);
  }

  if (!checkPath.startsWith(basePath)) {
    return `${basePath}${checkPath}`;
  }

  return checkPath;
};

export function getPagePath(courseId, isMfePageEnabled, urlParameter) {
  if (isMfePageEnabled === 'true') {
    if (urlParameter === 'tabs') {
      return createCorrectInternalRoute(`/course/${courseId}/pages-and-resources`);
    }
    return createCorrectInternalRoute(`/course/${courseId}/${urlParameter}`);
  }
  return `${getConfig().STUDIO_BASE_URL}/${urlParameter}/${courseId}`;
}

export function useAppSetting(settingName) {
  const dispatch = useDispatch();
  const { courseId } = useContext(PagesAndResourcesContext);
  const settingValue = useSelector(getCourseAppSettingValue(settingName));
  const loadingStatus = useSelector(getLoadingStatus);
  useEffect(() => {
    if ([RequestStatus.DENIED, RequestStatus.FAILED].includes(loadingStatus)) {
      return;
    }
    if (settingValue === undefined || settingValue === null) {
      dispatch(fetchCourseAppSettings(courseId, [settingName]));
    }
  }, [courseId]);

  const saveSetting = async (value) => dispatch(updateCourseAppSetting(courseId, settingName, value));
  return [settingValue, saveSetting];
}

export const getLabelById = (options, id) => {
  const foundOption = options.find((option) => option.id === id);
  return foundOption ? foundOption.label : '';
};

/**
 * Adds additional validation methods to Yup.
 */
export function setupYupExtensions() {
  // Add a uniqueProperty method to arrays that allows validating that the specified property path is unique
  // across all objects in the array.
  // Credit: https://github.com/jquense/yup/issues/345#issuecomment-717400071
  Yup.addMethod(Yup.array, 'uniqueProperty', function uniqueProperty(property, message) {
    return this.test('unique', '', function testUniqueness(list) {
      const errors = [];

      list.forEach((item, index) => {
        const propertyValue = item[property];

        if (propertyValue && list.filter(entry => entry[property] === propertyValue).length > 1) {
          errors.push(
            this.createError({
              path: `${this.path}[${index}].${property}`,
              message,
            }),
          );
        }
      });

      if (errors.length > 0) {
        throw new Yup.ValidationError(errors);
      }

      return true;
    });
  });

  Yup.addMethod(Yup.object, 'uniqueObjectProperty', function uniqueObjectProperty(propertyName, message) {
    return this.test('unique', message, function testUniqueness(discussionTopic) {
      if (!discussionTopic || !discussionTopic[propertyName]) {
        return true;
      }
      const isDuplicate = this.parent.filter(topic => topic !== discussionTopic)
        .some(topic => topic[propertyName]?.toLowerCase() === discussionTopic[propertyName].toLowerCase());

      if (isDuplicate) {
        throw this.createError({
          path: `${this.path}.${propertyName}`,
          error: message,
        });
      }
      return true;
    });
  });

  Yup.addMethod(Yup.string, 'compare', function compare(message, type) {
    return this.test('isGreater', message, function isGreater() {
      // This function compare 2 dates or 2 times. It return no error if dateInstance/timeInstance is empty
      // of if startTime or endTime is not present for time comparison
      // or startDate or endDate is not present for date comparison

      if (!this.parent
        || (!(this.parent.startTime && this.parent.endTime) && type === 'time')
        || (!(this.parent.startDate && this.parent.endDate) && type === 'date')
      ) {
        return true;
      }

      const startDateTime = decodeDateTime(this.parent.startDate, startOfDayTime(this.parent.startTime));
      const endDateTime = decodeDateTime(this.parent.endDate, endOfDayTime(this.parent.endTime));
      let isInvalidStartDateTime;

      if (type === 'date') {
        isInvalidStartDateTime = startDateTime.isAfter(endDateTime);
      } else if (type === 'time') {
        isInvalidStartDateTime = startDateTime.isSameOrAfter(endDateTime);
      }

      if (isInvalidStartDateTime) {
        throw this.createError({
          path: `${this.path}`,
          error: message,
        });
      }
      return true;
    });
  });

  Yup.addMethod(Yup.string, 'checkFormat', function checkFormat(message, type) {
    return this.test('isValidFormat', message, function isValidFormat() {
      if (!this.originalValue) {
        return true;
      }
      let isValid;

      if (type === 'date') {
        isValid = hasValidDateFormat(this.originalValue);
      } else if (type === 'time') {
        isValid = hasValidTimeFormat(this.originalValue);
      }

      if (!isValid) {
        throw this.createError({
          path: `${this.path}`,
          error: message,
        });
      }
      return true;
    });
  });
}

// Default institutional timezone. 'UTC' keeps the historical upstream behaviour
// (Studio pickers interpret and display every date as UTC).
export const DEFAULT_STUDIO_TIMEZONE = 'UTC';

/**
 * IANA timezone used to interpret and display every date entered in Studio
 * (Schedule & Details, subsection release/due dates, course updates).
 *
 * Configured through the `STUDIO_TIMEZONE` MFE setting. Falls back to UTC so
 * deployments that do not set it behave exactly like upstream.
 *
 * @return {string} e.g. 'America/Mexico_City' or 'UTC'
 */
export const getStudioTimezone = () => (getConfig() || {}).STUDIO_TIMEZONE || DEFAULT_STUDIO_TIMEZONE;

/**
 * Human-readable label for the institutional timezone, shown next to the
 * pickers. Uses the optional `STUDIO_TIMEZONE_LABEL` setting when present,
 * otherwise the raw IANA identifier (or 'UTC').
 *
 * @return {string}
 */
export const getStudioTimezoneLabel = () => (
  (getConfig() || {}).STUDIO_TIMEZONE_LABEL || getStudioTimezone()
);

/**
 * Offset, in milliseconds, between `timeZone` and UTC at the given instant.
 * Negative when the zone is behind UTC (e.g. -6h for America/Mexico_City).
 * Computed per-instant, so it stays correct across DST transitions.
 *
 * @param {Date} date - the instant to evaluate the offset at
 * @param {string} timeZone - IANA timezone id
 * @return {number} offset in ms (wallClockInZone - UTC)
 */
export const getTimezoneOffsetMs = (date, timeZone) => {
  if (!timeZone || timeZone === 'UTC') {
    return 0;
  }
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date).reduce((acc, { type, value }) => {
    if (type !== 'literal') {
      acc[type] = value;
    }
    return acc;
  }, {});
  const hour = parts.hour === '24' ? 0 : Number(parts.hour);
  const wallClockAsUtcMs = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second),
  );
  return wallClockAsUtcMs - date.getTime();
};

/**
 * Given wall-clock calendar/time fields that are meant to be read in `timeZone`,
 * return the matching UTC instant.
 *
 * @return {Date}
 */
export const wallClockInTimezoneToUtc = ({
  year, month, day, hour, minute, second = 0,
}, timeZone) => {
  const naiveUtcMs = Date.UTC(year, month, day, hour, minute, second);
  // First approximation: assume the offset that applies at the naive instant.
  let offsetMs = getTimezoneOffsetMs(new Date(naiveUtcMs), timeZone);
  // Refine once so instants near a DST boundary settle on the right offset.
  offsetMs = getTimezoneOffsetMs(new Date(naiveUtcMs - offsetMs), timeZone);
  return new Date(naiveUtcMs - offsetMs);
};

/**
 * Break a UTC instant down into the wall-clock fields it has in `timeZone`.
 *
 * @return {{year:number, month:number, day:number, hour:number, minute:number, second:number}}
 *   `month` is 0-indexed (Date-style).
 */
export const getWallClockPartsInTimezone = (date, timeZone) => {
  const shifted = new Date(date.getTime() + getTimezoneOffsetMs(date, timeZone));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
  };
};

export const convertToDateFromString = (dateStr) => {
  /**
   * Convert a stored UTC datetime string into a Date whose *local* wall-clock
   * fields match the institutional timezone, so react-datepicker (which only
   * ever works in the browser's local time) shows the institutional time.
   * @param {string} dateStr - YYYY-MM-DDTHH:MM:SSZ (UTC)
   * @return {Date|string} '' when the input is empty/invalid
   */
  if (!dateStr) {
    return '';
  }

  const raw = String(dateStr);
  const utcInstant = moment.utc(raw, moment.ISO_8601, true);

  // Full ISO 8601 datetime (Schedule & Details, subsection release/due dates):
  // shift the instant into the institutional timezone for the picker.
  if (raw.includes('T') && utcInstant.isValid()) {
    const {
      year, month, day, hour, minute, second,
    } = getWallClockPartsInTimezone(utcInstant.toDate(), getStudioTimezone());
    return new Date(year, month, day, hour, minute, second);
  }

  // Any other shape (e.g. the date-only "August 27, 2026" used by course
  // updates): keep the historical lenient, timezone-free parsing.
  const parsed = moment(raw.substring(0, 19));
  return parsed.isValid() ? parsed.toDate() : '';
};

export const convertToStringFromDate = (date) => {
  /**
   * Convert a Date coming from react-datepicker - whose *local* wall-clock
   * fields represent the institutional time the user picked - into the
   * equivalent UTC datetime string sent to the API.
   * @param {Date} date
   * @return {string} YYYY-MM-DDTHH:MM:SSZ (UTC)
   */
  if (!date) {
    return '';
  }

  const local = new Date(date);
  if (Number.isNaN(local.getTime())) {
    // Preserve the historical contract that isValidDate() relies on.
    return 'Invalid date';
  }

  const utcInstant = wallClockInTimezoneToUtc({
    year: local.getFullYear(),
    month: local.getMonth(),
    day: local.getDate(),
    hour: local.getHours(),
    minute: local.getMinutes(),
    second: local.getSeconds(),
  }, getStudioTimezone());

  return moment.utc(utcInstant).format(DATE_TIME_FORMAT);
};

export const isValidDate = (date) => {
  const formattedValue = convertToStringFromDate(date).split('T')[0];

  return Boolean(formattedValue.length <= 10);
};

export const getFileSizeToClosestByte = (fileSize) => {
  let divides = 0;
  let size = fileSize;
  while (size > 1000 && divides < 4) {
    size /= 1000;
    divides += 1;
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const fileSizeFixedDecimal = Number.parseFloat(size).toFixed(2);
  return `${fileSizeFixedDecimal} ${units[divides]}`;
};
