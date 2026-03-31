import { RequestStatus } from '../../data/constants';
import { updateClipboardData } from '../../generic/data/slice';
import { NOTIFICATION_MESSAGES } from '../../constants';
import { API_ERROR_TYPES, COURSE_BLOCK_NAMES } from '../constants';
import {
  hideProcessingNotification,
  showProcessingNotification,
} from '../../generic/processing-notification/data/slice';
import {
  getCourseBestPracticesChecklist,
  getCourseLaunchChecklist,
} from '../utils/getChecklistForStatusBar';

import {
  addNewCourseItem,
  deleteCourseItem,
  duplicateCourseItem,
  editItemDisplayName,
  enableCourseHighlightsEmails,
  getCourseBestPractices,
  getCourseLaunch,
  getCourseOutlineIndex,
  getCourseItem,
  publishCourseSection,
  configureCourseSection,
  configureCourseSubsection,
  configureCourseUnit,
  restartIndexingOnCourse,
  updateCourseSectionHighlights,
  setSectionOrderList,
  setVideoSharingOption,
  setCourseItemOrderList,
  pasteBlock,
  dismissNotification,
} from './api';

import {
  addSection,
  addSubsection,
  fetchOutlineIndexSuccess,
  updateOutlineIndexLoadingStatus,
  updateReindexLoadingStatus,
  updateStatusBar,
  updateCourseActions,
  fetchStatusBarChecklistSuccess,
  fetchStatusBarSelPacedSuccess,
  updateSavingStatus,
  updateSectionList,
  updateFetchSectionLoadingStatus,
  deleteSection,
  deleteSubsection,
  deleteUnit,
  duplicateSection,
  reorderSectionList,
  setPasteFileNotices,
  updateCourseLaunchQueryStatus,
  replaceOutlineItem,
  updateItemDisplayName,
} from './slice';

const getErrorDetails = (error, dismissible = true) => {
  const errorInfo = { dismissible };
  if (error.response?.data) {
    const { data } = error.response;
    if ((typeof data === 'string' && !data.includes('</html>')) || typeof data === 'object') {
      errorInfo.data = JSON.stringify(data);
    }
    errorInfo.status = error.response.status;
    errorInfo.type = API_ERROR_TYPES.serverError;
  } else if (error.request) {
    errorInfo.type = API_ERROR_TYPES.networkError;
  } else {
    errorInfo.type = API_ERROR_TYPES.unknown;
    errorInfo.data = error.message;
  }
  return errorInfo;
};

const EDIT_SAVE_TIMEOUT_MS = 20000;

const withTimeout = (promise, timeoutMs) => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    reject(new Error(`edit save timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  promise
    .then((result) => {
      clearTimeout(timeout);
      resolve(result);
    })
    .catch((error) => {
      clearTimeout(timeout);
      reject(error);
    });
});

export function fetchCourseOutlineIndexQuery(courseId) {
  return async (dispatch) => {
    dispatch(updateOutlineIndexLoadingStatus({ status: RequestStatus.IN_PROGRESS }));

    try {
      const outlineIndex = await getCourseOutlineIndex(courseId);

      const {
        courseReleaseDate,
        courseStructure: {
          highlightsEnabledForMessaging,
          videoSharingEnabled,
          videoSharingOptions,
          actions,
          end,
          hasChanges,
        },
      } = outlineIndex;

      dispatch(fetchOutlineIndexSuccess(outlineIndex));
      dispatch(updateClipboardData(outlineIndex.initialUserClipboard));
      dispatch(updateStatusBar({
        courseReleaseDate,
        highlightsEnabledForMessaging,
        videoSharingOptions,
        videoSharingEnabled,
        endDate: end,
        hasChanges,
      }));

      dispatch(updateCourseActions(actions));

      dispatch(updateOutlineIndexLoadingStatus({ status: RequestStatus.SUCCESSFUL }));
    } catch (error) {
      if (error.response && error.response.status === 403) {
        dispatch(updateOutlineIndexLoadingStatus({ status: RequestStatus.DENIED }));
      } else {
        dispatch(updateOutlineIndexLoadingStatus({
          status: RequestStatus.FAILED,
          errors: getErrorDetails(error, false),
        }));
      }
    }
  };
}

export function fetchCourseLaunchQuery({
  courseId,
  gradedOnly = true,
  validateOras = true,
  all = true,
}) {
  return async (dispatch) => {
    dispatch(updateCourseLaunchQueryStatus({ status: RequestStatus.IN_PROGRESS }));
    try {
      const data = await getCourseLaunch({
        courseId, gradedOnly, validateOras, all,
      });
      dispatch(fetchStatusBarSelPacedSuccess({ isSelfPaced: data.isSelfPaced }));
      dispatch(fetchStatusBarChecklistSuccess(getCourseLaunchChecklist(data)));

      dispatch(updateCourseLaunchQueryStatus({ status: RequestStatus.SUCCESSFUL }));
    } catch (error) {
      dispatch(updateCourseLaunchQueryStatus({
        status: RequestStatus.FAILED,
        errors: getErrorDetails(error),
      }));
    }
  };
}

export function fetchCourseBestPracticesQuery({
  courseId,
  excludeGraded = true,
  all = true,
}) {
  return async (dispatch) => {
    try {
      const data = await getCourseBestPractices({ courseId, excludeGraded, all });
      dispatch(fetchStatusBarChecklistSuccess(getCourseBestPracticesChecklist(data)));
      return true;
    } catch (error) {
      return false;
    }
  };
}

export function enableCourseHighlightsEmailsQuery(courseId) {
  return async (dispatch) => {
    dispatch(updateSavingStatus({ status: RequestStatus.PENDING }));
    dispatch(showProcessingNotification(NOTIFICATION_MESSAGES.saving));

    try {
      await enableCourseHighlightsEmails(courseId);
      dispatch(fetchCourseOutlineIndexQuery(courseId));

      dispatch(updateSavingStatus({ status: RequestStatus.SUCCESSFUL }));
      dispatch(hideProcessingNotification());
    } catch (error) {
      dispatch(updateSavingStatus({ status: RequestStatus.FAILED }));
    }
  };
}

export function setVideoSharingOptionQuery(courseId, option) {
  return async (dispatch) => {
    dispatch(updateSavingStatus({ status: RequestStatus.PENDING }));
    dispatch(showProcessingNotification(NOTIFICATION_MESSAGES.saving));

    try {
      await setVideoSharingOption(courseId, option);
      dispatch(updateStatusBar({ videoSharingOptions: option }));

      dispatch(updateSavingStatus({ status: RequestStatus.SUCCESSFUL }));
      dispatch(hideProcessingNotification());
    } catch (error) {
      dispatch(updateSavingStatus({ status: RequestStatus.FAILED }));
      dispatch(hideProcessingNotification());
    }
  };
}

export function fetchCourseReindexQuery(courseId, reindexLink) {
  return async (dispatch) => {
    dispatch(updateReindexLoadingStatus({ status: RequestStatus.IN_PROGRESS }));

    try {
      await restartIndexingOnCourse(reindexLink);
      dispatch(updateReindexLoadingStatus({ status: RequestStatus.SUCCESSFUL }));
    } catch (error) {
      dispatch(updateReindexLoadingStatus({
        status: RequestStatus.FAILED,
        errors: getErrorDetails(error),
      }));
    }
  };
}

export function fetchCourseSectionQuery(sectionIds) {
  return async (dispatch) => {
    dispatch(updateFetchSectionLoadingStatus({ status: RequestStatus.IN_PROGRESS }));

    try {
      const results = await Promise.all(sectionIds.map((sectionId) => getCourseItem(sectionId)));

      const sections = {};
      results.forEach((section) => {
        sections[section.id] = section;
      });

      dispatch(updateSectionList(sections));

      dispatch(updateFetchSectionLoadingStatus({ status: RequestStatus.SUCCESSFUL }));
    } catch (error) {
      dispatch(updateFetchSectionLoadingStatus({
        status: RequestStatus.FAILED,
        errors: getErrorDetails(error),
      }));
    }
  };
}

function refreshOutlineItemQuery(itemId) {
  return async (dispatch) => {
    const updatedItem = await getCourseItem(itemId);
    dispatch(replaceOutlineItem({ item: updatedItem }));
  };
}

export function updateCourseSectionHighlightsQuery(sectionId, highlights) {
  return async (dispatch) => {
    dispatch(updateSavingStatus({ status: RequestStatus.PENDING }));
    dispatch(showProcessingNotification(NOTIFICATION_MESSAGES.saving));

    try {
      const result = await updateCourseSectionHighlights(sectionId, highlights);
      if (result) {
        await dispatch(refreshOutlineItemQuery(sectionId));
        dispatch(updateSavingStatus({ status: RequestStatus.SUCCESSFUL }));
      } else {
        dispatch(updateSavingStatus({ status: RequestStatus.FAILED }));
      }
    } catch (error) {
      dispatch(updateSavingStatus({ status: RequestStatus.FAILED }));
    } finally {
      dispatch(hideProcessingNotification());
    }
  };
}

export function publishCourseItemQuery(itemId) {
  return async (dispatch) => {
    dispatch(updateSavingStatus({ status: RequestStatus.PENDING }));
    dispatch(showProcessingNotification(NOTIFICATION_MESSAGES.saving));

    try {
      const result = await publishCourseSection(itemId);
      if (result) {
        await dispatch(refreshOutlineItemQuery(itemId));
        dispatch(updateSavingStatus({ status: RequestStatus.SUCCESSFUL }));
      } else {
        dispatch(updateSavingStatus({ status: RequestStatus.FAILED }));
      }
    } catch (error) {
      dispatch(updateSavingStatus({ status: RequestStatus.FAILED }));
    } finally {
      dispatch(hideProcessingNotification());
    }
  };
}

export function configureCourseItemQuery(itemId, configureFn) {
  return async (dispatch) => {
    dispatch(updateSavingStatus({ status: RequestStatus.PENDING }));
    dispatch(showProcessingNotification(NOTIFICATION_MESSAGES.saving));

    try {
      const result = await configureFn();
      if (result) {
        await dispatch(refreshOutlineItemQuery(itemId));
        dispatch(updateSavingStatus({ status: RequestStatus.SUCCESSFUL }));
      } else {
        dispatch(updateSavingStatus({ status: RequestStatus.FAILED }));
      }
    } catch (error) {
      dispatch(updateSavingStatus({ status: RequestStatus.FAILED }));
    } finally {
      dispatch(hideProcessingNotification());
    }
  };
}

export function configureCourseSectionQuery(sectionId, isVisibleToStaffOnly, startDatetime) {
  return async (dispatch) => {
    dispatch(configureCourseItemQuery(
      sectionId,
      async () => configureCourseSection(sectionId, isVisibleToStaffOnly, startDatetime),
    ));
  };
}

export function configureCourseSubsectionQuery(
  itemId,
  sectionId,
  isVisibleToStaffOnly,
  releaseDate,
  graderType,
  dueDate,
  isTimeLimited,
  isProctoredExam,
  isOnboardingExam,
  isPracticeExam,
  examReviewRules,
  defaultTimeLimitMin,
  hideAfterDue,
  showCorrectness,
  isPrereq,
  prereqUsageKey,
  prereqMinScore,
  prereqMinCompletion,
) {
  return async (dispatch) => {
    dispatch(configureCourseItemQuery(
      itemId,
      async () => configureCourseSubsection(
        itemId,
        isVisibleToStaffOnly,
        releaseDate,
        graderType,
        dueDate,
        isTimeLimited,
        isProctoredExam,
        isOnboardingExam,
        isPracticeExam,
        examReviewRules,
        defaultTimeLimitMin,
        hideAfterDue,
        showCorrectness,
        isPrereq,
        prereqUsageKey,
        prereqMinScore,
        prereqMinCompletion,
      ),
    ));
  };
}

export function configureCourseUnitQuery(itemId, _sectionId, isVisibleToStaffOnly, groupAccess, discussionEnabled) {
  return async (dispatch) => {
    dispatch(configureCourseItemQuery(
      itemId,
      async () => configureCourseUnit(itemId, isVisibleToStaffOnly, groupAccess, discussionEnabled),
    ));
  };
}
export function editCourseItemQuery(itemId, _sectionId, displayName) {
  return async (dispatch) => {
    // eslint-disable-next-line no-console
    console.log('AUTHORING-FORK version 1.5 save flow start', { itemId, displayName });
    // eslint-disable-next-line no-console
    console.log('AUTHORING-FORK v1.5 thunk start', { itemId, displayName });
    dispatch(updateSavingStatus({ status: RequestStatus.PENDING }));
    // eslint-disable-next-line no-console
    console.log('AUTHORING-FORK v1.5 saving status start', { status: RequestStatus.PENDING, itemId });
    dispatch(showProcessingNotification(NOTIFICATION_MESSAGES.saving));

    try {
      // eslint-disable-next-line no-console
      console.log('AUTHORING-FORK v1.5 request sent', { itemId, timeoutMs: EDIT_SAVE_TIMEOUT_MS });
      await withTimeout(editItemDisplayName(itemId, displayName), EDIT_SAVE_TIMEOUT_MS);
      // eslint-disable-next-line no-console
      console.log('AUTHORING-FORK v1.5 request resolved', { itemId });
      dispatch(updateItemDisplayName({ itemId, displayName }));
      dispatch(updateSavingStatus({ status: RequestStatus.SUCCESSFUL }));
      // eslint-disable-next-line no-console
      console.log('AUTHORING-FORK v1.5 saving status end', { status: RequestStatus.SUCCESSFUL, itemId });
      // eslint-disable-next-line no-console
      console.log('AUTHORING-FORK version 1.5 save flow end', { itemId });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('AUTHORING-FORK v1.5 request rejected', { itemId, error });
      dispatch(updateSavingStatus({ status: RequestStatus.FAILED }));
      // eslint-disable-next-line no-console
      console.log('AUTHORING-FORK version 1.5 save flow error', { itemId });
    } finally {
      dispatch(hideProcessingNotification());
    }
  };
}

function deleteCourseItemQuery(itemId, deleteItemFn) {
  return async (dispatch) => {
    dispatch(updateSavingStatus({ status: RequestStatus.PENDING }));
    dispatch(showProcessingNotification(NOTIFICATION_MESSAGES.deleting));

    try {
      await deleteCourseItem(itemId);
      dispatch(deleteItemFn());
      dispatch(hideProcessingNotification());
      dispatch(updateSavingStatus({ status: RequestStatus.SUCCESSFUL }));
    } catch (error) {
      dispatch(hideProcessingNotification());
      dispatch(updateSavingStatus({ status: RequestStatus.FAILED }));
    }
  };
}

export function deleteCourseSectionQuery(sectionId) {
  return async (dispatch) => {
    dispatch(deleteCourseItemQuery(
      sectionId,
      () => deleteSection({ itemId: sectionId }),
    ));
  };
}

export function deleteCourseSubsectionQuery(subsectionId, sectionId) {
  return async (dispatch) => {
    dispatch(deleteCourseItemQuery(
      subsectionId,
      () => deleteSubsection({ itemId: subsectionId, sectionId }),
    ));
  };
}

export function deleteCourseUnitQuery(unitId, subsectionId, sectionId) {
  return async (dispatch) => {
    dispatch(deleteCourseItemQuery(
      unitId,
      () => deleteUnit({ itemId: unitId, subsectionId, sectionId }),
    ));
  };
}

function duplicateCourseItemQuery(itemId, parentLocator, duplicateFn) {
  return async (dispatch) => {
    dispatch(updateSavingStatus({ status: RequestStatus.PENDING }));
    dispatch(showProcessingNotification(NOTIFICATION_MESSAGES.duplicating));

    try {
      await duplicateCourseItem(itemId, parentLocator).then(async (result) => {
        if (result) {
          await duplicateFn(result.locator);
          dispatch(hideProcessingNotification());
          dispatch(updateSavingStatus({ status: RequestStatus.SUCCESSFUL }));
        }
      });
    } catch (error) {
      dispatch(hideProcessingNotification());
      dispatch(updateSavingStatus({ status: RequestStatus.FAILED }));
    }
  };
}

export function duplicateSectionQuery(sectionId, courseBlockId) {
  return async (dispatch) => {
    dispatch(duplicateCourseItemQuery(
      sectionId,
      courseBlockId,
      async (locator) => {
        const duplicatedItem = await getCourseItem(locator);
        duplicatedItem.shouldScroll = true;
        dispatch(duplicateSection({ id: sectionId, duplicatedItem }));
      },
    ));
  };
}

export function duplicateSubsectionQuery(subsectionId, sectionId) {
  return async (dispatch) => {
    dispatch(duplicateCourseItemQuery(
      subsectionId,
      sectionId,
      async () => dispatch(fetchCourseSectionQuery([sectionId])),
    ));
  };
}

export function duplicateUnitQuery(unitId, subsectionId, sectionId) {
  return async (dispatch) => {
    dispatch(duplicateCourseItemQuery(
      unitId,
      subsectionId,
      async () => dispatch(fetchCourseSectionQuery([sectionId])),
    ));
  };
}

function addNewCourseItemQuery(parentLocator, category, displayName, addItemFn) {
  return async (dispatch) => {
    dispatch(updateSavingStatus({ status: RequestStatus.PENDING }));
    dispatch(showProcessingNotification(NOTIFICATION_MESSAGES.saving));

    try {
      const result = await addNewCourseItem(parentLocator, category, displayName);

      if (result) {
        await addItemFn(result);
        dispatch(updateSavingStatus({ status: RequestStatus.SUCCESSFUL }));
      } else {
        dispatch(updateSavingStatus({ status: RequestStatus.FAILED }));
      }
    } catch (error) {
      dispatch(updateSavingStatus({ status: RequestStatus.FAILED }));
    } finally {
      dispatch(hideProcessingNotification());
    }
  };
}

export function addNewSectionQuery(parentLocator) {
  return async (dispatch) => {
    dispatch(addNewCourseItemQuery(
      parentLocator,
      COURSE_BLOCK_NAMES.chapter.id,
      COURSE_BLOCK_NAMES.chapter.name,
      async (result) => {
        const data = await getCourseItem(result.locator);
        data.shouldScroll = true;
        dispatch(addSection(data));
      },
    ));
  };
}

export function addNewSubsectionQuery(parentLocator) {
  return async (dispatch) => {
    await dispatch(addNewCourseItemQuery(
      parentLocator,
      COURSE_BLOCK_NAMES.sequential.id,
      COURSE_BLOCK_NAMES.sequential.name,
      async (result) => {
        const data = await getCourseItem(result.locator);
        data.shouldScroll = true;
        dispatch(addSubsection({ parentLocator, data }));
      },
    ));
  };
}

export function addNewUnitQuery(parentLocator, callback) {
  return async (dispatch) => {
    const thunk = addNewCourseItemQuery(
      parentLocator,
      COURSE_BLOCK_NAMES.vertical.id,
      COURSE_BLOCK_NAMES.vertical.name,
      async (result) => {
        await callback(result.locator);
      },
    );

    await dispatch(thunk);
  };
}

function setBlockOrderListQuery(parentId, blockIds, apiFn, restoreCallback, successCallback) {
  return async (dispatch) => {
    dispatch(updateSavingStatus({ status: RequestStatus.PENDING }));
    dispatch(showProcessingNotification(NOTIFICATION_MESSAGES.saving));

    try {
      await apiFn(parentId, blockIds).then(async (result) => {
        if (result) {
          successCallback();
          dispatch(updateSavingStatus({ status: RequestStatus.SUCCESSFUL }));
          dispatch(hideProcessingNotification());
        }
      });
    } catch (error) {
      restoreCallback();
      dispatch(hideProcessingNotification());
      dispatch(updateSavingStatus({ status: RequestStatus.FAILED }));
    }
  };
}

export function setSectionOrderListQuery(courseId, sectionListIds, restoreCallback) {
  return async (dispatch) => {
    dispatch(setBlockOrderListQuery(
      courseId,
      sectionListIds,
      setSectionOrderList,
      restoreCallback,
      () => dispatch(reorderSectionList(sectionListIds)),
    ));
  };
}

export function setSubsectionOrderListQuery(
  sectionId,
  subsectionListIds,
  changedSections,
  restoreCallback,
) {
  return async (dispatch) => {
    dispatch(setBlockOrderListQuery(
      sectionId,
      subsectionListIds,
      setCourseItemOrderList,
      restoreCallback,
      () => dispatch(fetchCourseSectionQuery(Object.keys(changedSections))),
    ));
  };
}

export function setUnitOrderListQuery(
  subsectionId,
  unitListIds,
  changedSections,
  restoreCallback,
) {
  return async (dispatch) => {
    dispatch(setBlockOrderListQuery(
      subsectionId,
      unitListIds,
      setCourseItemOrderList,
      restoreCallback,
      () => dispatch(fetchCourseSectionQuery(Object.keys(changedSections))),
    ));
  };
}

export function pasteClipboardContent(parentLocator, sectionId) {
  return async (dispatch) => {
    dispatch(updateSavingStatus({ status: RequestStatus.PENDING }));
    dispatch(showProcessingNotification(NOTIFICATION_MESSAGES.pasting));

    try {
      await pasteBlock(parentLocator).then(async (result) => {
        if (result) {
          dispatch(fetchCourseSectionQuery([sectionId]));
          dispatch(updateSavingStatus({ status: RequestStatus.SUCCESSFUL }));
          dispatch(hideProcessingNotification());
          dispatch(setPasteFileNotices(result?.staticFileNotices));
        }
      });
    } catch (error) {
      dispatch(hideProcessingNotification());
      dispatch(updateSavingStatus({ status: RequestStatus.FAILED }));
    }
  };
}

export function dismissNotificationQuery(url) {
  return async (dispatch) => {
    dispatch(updateSavingStatus({ status: RequestStatus.PENDING }));

    try {
      await dismissNotification(url).then(async () => {
        dispatch(updateSavingStatus({ status: RequestStatus.SUCCESSFUL }));
      });
    } catch (error) {
      dispatch(updateSavingStatus({ status: RequestStatus.FAILED }));
    }
  };
}
