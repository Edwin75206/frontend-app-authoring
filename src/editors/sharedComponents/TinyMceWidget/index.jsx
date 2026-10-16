import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Editor } from '@tinymce/tinymce-react';
import { getConfig } from '@edx/frontend-platform';

import 'tinymce';
import 'tinymce/themes/silver';
import 'tinymce/skins/ui/oxide/skin.css';
import 'tinymce/icons/default';
import 'tinymce/plugins/searchreplace';
import 'tinymce/plugins/fullscreen';
import 'tinymce/plugins/preview';
import 'frontend-components-tinymce-advanced-plugins';

import ImageUploadModal from '../ImageUploadModal';
import SourceCodeModal from '../SourceCodeModal';
import PdfUploadModal from '../PdfUploadModal';
import * as hooks from './hooks';
import './customTinyMcePlugins/embedIframePlugin';
import './customTinyMcePlugins/insertPdfPlugin';

export { prepareEditorRef } from './hooks';

const editorConfigDefaultProps = {
  setEditorRef: undefined,
  placeholder: undefined,
  initializeEditor: undefined,
  updateContent: undefined,
  content: undefined,
  minHeight: undefined,
};

const editorConfigPropTypes = {
  setEditorRef: PropTypes.func,
  placeholder: PropTypes.any,
  initializeEditor: PropTypes.func,
  updateContent: PropTypes.func,
  content: PropTypes.any,
  minHeight: PropTypes.any,
};

const TinyMceWidget = ({
  editorType,
  editorRef,
  disabled,
  id,
  editorContentHtml, // editorContent in html form
  learningContextId,
  images,
  isLibrary,
  onChange,
  staticRootUrl,
  ...editorConfig
}) => {
  const { isImgOpen, openImgModal, closeImgModal } = hooks.imgModalToggle();
  const { isSourceCodeOpen, openSourceCodeModal, closeSourceCodeModal } = hooks.sourceCodeModalToggle(editorRef);
  const { imagesRef } = hooks.useImages({ images, editorContentHtml });
  const imageSelection = hooks.selectedImage(null);
  const [pdfContext, setPdfContext] = useState(null);

  return (
    <>
      {editorType === 'text' && !isLibrary && pdfContext && (
        <PdfUploadModal
          courseId={learningContextId}
          editor={pdfContext.editor}
          bookmark={pdfContext.bookmark}
          close={() => {
            setPdfContext(null);
            editorRef.current?.focus();
          }}
        />
      )}
      {!isLibrary && (
        <ImageUploadModal
          isOpen={isImgOpen}
          close={closeImgModal}
          editorRef={editorRef}
          images={imagesRef}
          editorType={editorType}
          lmsEndpointUrl={getConfig().LMS_BASE_URL}
          {...imageSelection}
        />
      )}
      {editorType === 'text' && (
        <SourceCodeModal
          isOpen={isSourceCodeOpen}
          close={closeSourceCodeModal}
          editorRef={editorRef}
        />
      )}
      <Editor
        id={id}
        disabled={disabled}
        onEditorChange={onChange}
        {
          ...hooks.editorConfig({
            openImgModal,
            openSourceCodeModal,
            openPdfModal: setPdfContext,
            editorType,
            editorRef,
            isLibrary,
            learningContextId,
            images: imagesRef,
            editorContentHtml,
            staticRootUrl,
            ...imageSelection,
            ...editorConfig,
          })
        }
      />
    </>
  );
};
TinyMceWidget.defaultProps = {
  isLibrary: null,
  editorType: null,
  editorRef: null,
  lmsEndpointUrl: '',
  studioEndpointUrl: '',
  images: null,
  id: null,
  disabled: false,
  editorContentHtml: undefined,
  updateContent: undefined,
  onChange: () => ({}),
  ...editorConfigDefaultProps,
};
TinyMceWidget.propTypes = {
  learningContextId: PropTypes.string.isRequired,
  editorType: PropTypes.string,
  isLibrary: PropTypes.bool,
  images: PropTypes.shape({}),
  editorRef: PropTypes.shape({}),
  lmsEndpointUrl: PropTypes.string,
  studioEndpointUrl: PropTypes.string,
  id: PropTypes.string,
  disabled: PropTypes.bool,
  editorContentHtml: PropTypes.string,
  updateContent: PropTypes.func,
  onChange: PropTypes.func,
  ...editorConfigPropTypes,
};

export const TinyMceWidgetInternal = TinyMceWidget; // For testing only
export default TinyMceWidget;
