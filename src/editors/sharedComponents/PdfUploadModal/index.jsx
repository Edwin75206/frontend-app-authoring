import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert, Button, Dropzone, Form, Icon, Spinner, Tabs, Tab,
} from '@openedx/paragon';
import { PictureAsPdf } from '@openedx/paragon/icons';
import BaseModal from '../BaseModal';
import { uploadAssets } from '../../../generic/modal-dropzone/data/api';
import { getAssetDetails } from '../../../files-and-videos/files-page/data/api';
import { getUploadConflicts } from '../../../files-and-videos/files-page/data/utils';
import pdfMessages from './messages';
import ExistingPdfPicker from './ExistingPdfPicker';
import {
  pdfAssetUrl, pdfHtml, validPdf, validSettings,
} from './utils';
import './index.scss';

const PdfUploadModal = ({
  courseId, editor, bookmark, close,
}) => {
  const { locale } = useIntl();
  const text = pdfMessages(locale);
  const [status, setStatus] = useState('idle');
  const [source, setSource] = useState('upload');
  const [asset, setAsset] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [height, setHeight] = useState('700');
  const busy = useRef(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const upload = async (selected, replace = false) => {
    if (busy.current) { return; }
    if (!validPdf(selected) || !selected.size) {
      setError(selected && !selected.size ? text.empty : text.invalid);
      return;
    }
    busy.current = true;
    setFile(selected);
    setAsset(null);
    setError('');
    setProgress(0);
    setStatus('uploading');
    try {
      if (!replace) {
        const { assets } = await getAssetDetails({ courseId, filenames: [selected.name], fileCount: 1 });
        if (!alive.current) { return; }
        const [conflicts] = getUploadConflicts([selected], assets);
        if (Object.keys(conflicts).length) {
          setStatus('duplicate');
          return;
        }
      }
      const data = new FormData();
      data.append('file', selected);
      const result = await uploadAssets(courseId, data, event => {
        if (alive.current && event.total) {
          setProgress(Math.min(99, Math.round((100 * event.loaded) / event.total)));
        }
      });
      if (!alive.current) { return; }
      pdfAssetUrl(result.asset);
      setAsset(result.asset);
      setTitle(result.asset.displayName || selected.name);
      setStatus('ready');
    } catch (exception) {
      if (alive.current) {
        setError(exception.response?.status === 413 ? text.large : text.error);
        setStatus('error');
      }
    } finally {
      busy.current = false;
    }
  };

  const insert = () => {
    if (busy.current || !asset || status !== 'ready' || !validSettings(title, height)) { return; }
    busy.current = true;
    editor.focus();
    editor.selection.moveToBookmark(bookmark);
    editor.undoManager.transact(() => editor.insertContent(pdfHtml(asset, title, height)));
    editor.nodeChanged();
    close();
  };

  return (
    <BaseModal
      isOpen
      close={() => { if (!busy.current) { close(); } }}
      title={text.insert}
      size="lg"
      bodyStyle={{ maxHeight: 'calc(100vh - 200px)' }}
      className="academus-pdf-modal"
      confirmAction={(
        <Button onClick={insert} disabled={status !== 'ready' || !validSettings(title, height)}>
          {text.insert}
        </Button>
      )}
    >
      <p>{source === 'existing' ? text.existingHelp : text.help}</p>
      <Tabs
        id="academus-pdf-source"
        activeKey={source}
        moreTabText={text.moreTabs}
        onSelect={value => {
          if (!busy.current) {
            setSource(value);
            setStatus('idle');
            setAsset(null);
            setError('');
          }
        }}
        className="mb-3"
      >
        <Tab eventKey="upload" title={text.uploadTab} disabled={status === 'uploading'} />
        <Tab eventKey="existing" title={text.existingTab} disabled={status === 'uploading'} />
      </Tabs>
      {error && <Alert variant="danger">{error}</Alert>}
      {source === 'existing' && status !== 'ready' && (
        <ExistingPdfPicker
          courseId={courseId}
          onSelect={selected => {
            setAsset(selected);
            setTitle(selected.displayName);
            setStatus('ready');
          }}
        />
      )}
      {status === 'uploading' && (
        <div className="academus-pdf-file text-center" role="status" aria-live="polite">
          <Spinner animation="border" screenReaderText={text.uploading} />
          <p className="mt-3 mb-0">{text.uploading} {progress > 0 && `${progress}%`}</p>
          <p className="small mb-0">{file?.name}</p>
        </div>
      )}
      {status === 'duplicate' && (
        <Alert variant="warning">
          <p>{text.duplicate}</p>
          <p className="text-break">{file.name}</p>
          <Button onClick={() => upload(file, true)}>{text.replace}</Button>
          <Button variant="link" onClick={() => setStatus('idle')}>{text.choose}</Button>
        </Alert>
      )}
      {source === 'upload' && ['idle', 'error'].includes(status) && (
        <>
          <Dropzone
            role="button"
            accept={{ 'application/pdf': ['.pdf'] }}
            minSize={1}
            onProcessUpload={({ fileData }) => upload(fileData.get('file'))}
            validator={selected => (validPdf(selected) ? null : text.invalid)}
            errorMessages={{ invalidType: text.invalid, multipleDragged: text.invalid, invalidSizeLess: text.empty }}
            aria-label={text.drop}
            inputComponent={(
              <div className="text-center py-2">
                <Icon src={PictureAsPdf} className="academus-pdf-icon mx-auto mb-2" />
                <p className="h4 mb-2">{text.drop}</p><p className="mb-0">{text.browse}</p>
              </div>
            )}
          />
          {status === 'error' && file && <Button className="mt-3" onClick={() => upload(file)}>{text.retry}</Button>}
        </>
      )}
      {status === 'ready' && (
        <>
          <div className="academus-pdf-file mb-3" role="status">
            <strong>{source === 'existing' ? text.selected : text.ready}</strong><p className="mb-0 mt-1">{asset.displayName}</p>
            <Button variant="link" size="sm" className="p-0 mt-1" onClick={() => { setAsset(null); setStatus('idle'); }}>{text.another}</Button>
          </div>
          <Form.Group controlId="academus-pdf-title">
            <Form.Label>{text.title}</Form.Label>
            <Form.Control value={title} onChange={event => setTitle(event.target.value)} required />
            <Form.Text>{text.titleHelp}</Form.Text>
          </Form.Group>
          <details className="mb-3">
            <summary>{text.settings}</summary>
            <Form.Group controlId="academus-pdf-height" className="mt-3">
              <Form.Label>{text.height}</Form.Label>
              <Form.Control type="number" min="200" max="2000" step="1" value={height} onChange={event => setHeight(event.target.value)} />
            </Form.Group>
          </details>
          {!validSettings(title, height) && <p role="alert">{text.invalidSettings}</p>}
          <p className="small mb-0">{text.retained}</p>
        </>
      )}
    </BaseModal>
  );
};

PdfUploadModal.propTypes = {
  courseId: PropTypes.string.isRequired,
  editor: PropTypes.shape({
    focus: PropTypes.func,
    selection: PropTypes.shape({ moveToBookmark: PropTypes.func }),
    undoManager: PropTypes.shape({ transact: PropTypes.func }),
    insertContent: PropTypes.func,
    nodeChanged: PropTypes.func,
  }).isRequired,
  bookmark: PropTypes.shape({}).isRequired,
  close: PropTypes.func.isRequired,
};

export default PdfUploadModal;
