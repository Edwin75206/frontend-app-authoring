import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  calendarAltText: {
    id: 'course-authoring.schedule.schedule-section.alt-text',
    defaultMessage: 'Calendar for datepicker input',
  },
  datepickerUTC: {
    id: 'course-authoring.schedule.schedule-section.datepicker.utc',
    defaultMessage: 'UTC',
  },
  datepickerTimezone: {
    id: 'course-authoring.schedule.schedule-section.datepicker.timezone',
    defaultMessage: '{timezone}',
    description: 'Timezone shown next to the time picker; value is an IANA id or a configured label.',
  },
});

export default messages;
