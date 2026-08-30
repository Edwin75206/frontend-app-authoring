import React from 'react';
import PropTypes from 'prop-types';

import { COURSE_BLOCK_NAMES } from '../constants';
import ReleaseStatus from './ReleaseStatus';
import GradingPolicyAlert from './GradingPolicyAlert';
import GradingTypeAndDueDate from './GradingTypeAndDueDate';
import StatusMessages from './StatusMessages';
import HideAfterDueMessage from './HideAfterDueMessage';
import { formatDateForStudioTimezone } from './date-utils';

const XBlockStatus = ({
  isSelfPaced,
  isCustomRelativeDatesActive,
  blockData,
}) => {
  const {
    category,
    explanatoryMessage,
    releasedToStudents,
    releaseDate,
    start,
    isProctoredExam,
    isOnboardingExam,
    isPracticeExam,
    prereq,
    prereqs,
    staffOnlyMessage,
    userPartitionInfo,
    hasPartitionGroupComponents,
    format: gradingType,
    dueDate,
    due,
    relativeWeeksDue,
    isTimeLimited,
    graded,
    courseGraders,
    hideAfterDue,
  } = blockData;

  const isInstructorPaced = !isSelfPaced;
  const isVertical = category === COURSE_BLOCK_NAMES.vertical.id;
  const releaseDateForDisplay = formatDateForStudioTimezone(start, releaseDate);
  const dueDateForDisplay = formatDateForStudioTimezone(due, dueDate);

  return (
    <div className="text-secondary-400 x-small mb-1">
      {!isVertical && (
        <ReleaseStatus
          isInstructorPaced={isInstructorPaced}
          explanatoryMessage={explanatoryMessage}
          releaseDate={releaseDateForDisplay}
          releasedToStudents={releasedToStudents}
        />
      )}
      {!isVertical && (
        <GradingTypeAndDueDate
          isSelfPaced={isSelfPaced}
          isInstructorPaced={isInstructorPaced}
          isCustomRelativeDatesActive={isCustomRelativeDatesActive}
          isTimeLimited={isTimeLimited}
          isProctoredExam={isProctoredExam}
          isOnboardingExam={isOnboardingExam}
          isPracticeExam={isPracticeExam}
          graded={graded}
          gradingType={gradingType}
          dueDate={dueDateForDisplay}
          relativeWeeksDue={relativeWeeksDue}
        />
      )}
      {hideAfterDue && (
        <HideAfterDueMessage isSelfPaced={isSelfPaced} />
      )}
      <StatusMessages
        isVertical={isVertical}
        staffOnlyMessage={staffOnlyMessage}
        prereq={prereq}
        prereqs={prereqs}
        userPartitionInfo={userPartitionInfo}
        hasPartitionGroupComponents={hasPartitionGroupComponents}
      />
      <GradingPolicyAlert
        graded={graded}
        gradingType={gradingType}
        courseGraders={courseGraders}
      />
    </div>
  );
};

XBlockStatus.defaultProps = {
  isCustomRelativeDatesActive: false,
};

XBlockStatus.propTypes = {
  isSelfPaced: PropTypes.bool.isRequired,
  isCustomRelativeDatesActive: PropTypes.bool,
  blockData: PropTypes.shape({
    category: PropTypes.string.isRequired,
    explanatoryMessage: PropTypes.string,
    releasedToStudents: PropTypes.bool,
    releaseDate: PropTypes.string,
    start: PropTypes.string,
    isProctoredExam: PropTypes.bool,
    isOnboardingExam: PropTypes.bool,
    isPracticeExam: PropTypes.bool,
    prereq: PropTypes.string,
    prereqs: PropTypes.arrayOf(PropTypes.shape({
      blockUsageKey: PropTypes.string.isRequired,
      blockDisplayName: PropTypes.string.isRequired,
    })),
    staffOnlyMessage: PropTypes.bool,
    userPartitionInfo: PropTypes.shape({
      selectedPartitionIndex: PropTypes.number,
      selectedGroupsLabel: PropTypes.string,
    }),
    hasPartitionGroupComponents: PropTypes.bool,
    format: PropTypes.string,
    dueDate: PropTypes.string,
    due: PropTypes.string,
    relativeWeeksDue: PropTypes.number,
    isTimeLimited: PropTypes.bool,
    graded: PropTypes.bool,
    courseGraders: PropTypes.arrayOf(PropTypes.string.isRequired),
    hideAfterDue: PropTypes.bool,
  }).isRequired,
};

export default XBlockStatus;
