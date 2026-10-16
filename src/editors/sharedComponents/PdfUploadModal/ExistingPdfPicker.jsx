import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Alert, Button, Form, Spinner,
} from '@openedx/paragon';
import { getAssets } from '../../../files-and-videos/files-page/data/api';
import pdfMessages from './messages';
import { isPdfAsset } from './utils';

const ExistingPdfPicker = ({ courseId, onSelect }) => {
  const { locale } = useIntl();
  const text = pdfMessages(locale);
  const [assets, setAssets] = useState([]);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setStatus('loading');
      try {
        let page = 0;
        let hasMore = true;
        const found = new Map();
        while (hasMore && !cancelled) {
          // Same paginated course-assets API used by Files & Uploads.
          // eslint-disable-next-line no-await-in-loop
          const result = await getAssets(courseId, page);
          if (cancelled) { return; }
          result.assets.filter(isPdfAsset).forEach(asset => found.set(asset.id, asset));
          hasMore = result.assets.length > 0 && ((page + 1) * result.pageSize < result.totalCount);
          page += 1;
        }
        if (!cancelled) {
          setAssets(Array.from(found.values()));
          setStatus('ready');
        }
      } catch (error) {
        if (!cancelled) { setStatus('error'); }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [courseId, attempt]);

  if (status === 'loading') {
    return <div className="py-4 text-center" role="status"><Spinner animation="border" screenReaderText={text.loading} /><p>{text.loading}</p></div>;
  }
  if (status === 'error') {
    return <Alert variant="danger">{text.loadError}<Button className="ml-3" onClick={() => setAttempt(attempt + 1)}>{text.retry}</Button></Alert>;
  }
  if (!assets.length) { return <p role="status">{text.noPdfs}</p>; }

  const matches = assets.filter(asset => asset.displayName?.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <div>
      <Form.Group controlId="academus-pdf-search">
        <Form.Label>{text.search}</Form.Label>
        <Form.Control type="search" value={search} onChange={event => setSearch(event.target.value)} />
      </Form.Group>
      <div className="academus-pdf-existing-list">
        {matches.map(asset => (
          <Button key={asset.id} variant="outline-primary" className="d-block w-100 mb-2 text-left text-break" onClick={() => onSelect(asset)}>
            {asset.displayName}
          </Button>
        ))}
        {!matches.length && <p role="status">{text.noResults}</p>}
      </div>
    </div>
  );
};

ExistingPdfPicker.propTypes = {
  courseId: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
};

export default ExistingPdfPicker;
