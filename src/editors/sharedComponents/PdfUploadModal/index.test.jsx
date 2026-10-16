import React from 'react';
import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { initializeMockApp } from '@edx/frontend-platform';
import PdfUploadModal from '.';
import { uploadAssets } from '../../../generic/modal-dropzone/data/api';
import { getAssetDetails, getAssets } from '../../../files-and-videos/files-page/data/api';
import { pdfHtml, pdfAssetUrl } from './utils';
import pluginConfig from '../TinyMceWidget/pluginConfig';

jest.mock('../../../generic/modal-dropzone/data/api', () => ({ uploadAssets: jest.fn() }));
jest.mock('../../../files-and-videos/files-page/data/api', () => ({ getAssetDetails: jest.fn(), getAssets: jest.fn() }));

const asset = { id: 'asset-key', url: '/asset-v1:Academus+PDF+test+type@asset+block@guide.pdf', displayName: 'guide.pdf' };
const file = new File(['%PDF-1.4 test'], 'guide.pdf', { type: 'application/pdf' });
let editor;
let close;
const select = () => userEvent.upload(document.querySelector('input[type=file]'), file);
const renderModal = () => render(
  <IntlProvider locale="en"><PdfUploadModal courseId="course-v1:Academus+PDF+test" editor={editor} bookmark={{ start: [0] }} close={close} /></IntlProvider>,
);

beforeEach(() => {
  initializeMockApp();
  jest.clearAllMocks();
  editor = {
    focus: jest.fn(),
    selection: { moveToBookmark: jest.fn() },
    undoManager: { transact: callback => callback() },
    insertContent: jest.fn(),
    nodeChanged: jest.fn(),
  };
  close = jest.fn();
  getAssetDetails.mockResolvedValue({ assets: [] });
  getAssets.mockResolvedValue({ assets: [{ ...asset, contentType: 'application/pdf' }], pageSize: 50, totalCount: 1 });
  uploadAssets.mockResolvedValue({ asset });
});

it('uploads automatically through the shared API and inserts the returned URL at the bookmark', async () => {
  renderModal();
  expect(screen.getByRole('button', { name: 'Insert PDF' })).toBeDisabled();
  select();
  await screen.findByText('PDF uploaded successfully');
  expect(uploadAssets.mock.calls[0][0]).toBe('course-v1:Academus+PDF+test');
  expect(uploadAssets.mock.calls[0][1].get('file').name).toBe(file.name);
  userEvent.click(screen.getByRole('button', { name: 'Insert PDF' }));
  expect(editor.selection.moveToBookmark).toHaveBeenCalledWith({ start: [0] });
  expect(editor.insertContent).toHaveBeenCalledWith(pdfHtml(asset, 'guide.pdf', '700'));
  expect(close).toHaveBeenCalledTimes(1);
});

it('handles drag and drop and blocks invalid title/height', async () => {
  renderModal();
  fireEvent.drop(screen.getByTestId('dropzone-container'), { dataTransfer: { files: [file], items: [{ kind: 'file', type: file.type, getAsFile: () => file }], types: ['Files'] } });
  await screen.findByText('PDF uploaded successfully');
  fireEvent.change(screen.getByLabelText('Document title'), { target: { value: '' } });
  expect(screen.getByRole('button', { name: 'Insert PDF' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Document title'), { target: { value: 'A useful title' } });
  fireEvent.change(screen.getByLabelText('Height (pixels)'), { target: { value: '0' } });
  expect(screen.getByRole('button', { name: 'Insert PDF' })).toBeDisabled();
});

it('shows upload errors, inserts nothing, and retries', async () => {
  uploadAssets.mockRejectedValueOnce(new Error('network'));
  renderModal(); select();
  await screen.findByText('We could not upload the PDF. Try again.');
  expect(editor.insertContent).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Insert PDF' })).toBeDisabled();
  userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByText('PDF uploaded successfully');
  expect(uploadAssets).toHaveBeenCalledTimes(2);
});

it('asks before replacing a duplicate, preserving Files & Uploads semantics', async () => {
  getAssetDetails.mockResolvedValue({ assets: [asset] });
  renderModal(); select();
  await screen.findByRole('button', { name: 'Replace existing file' });
  expect(uploadAssets).not.toHaveBeenCalled();
  userEvent.click(screen.getByRole('button', { name: 'Replace existing file' }));
  await screen.findByText('PDF uploaded successfully');
  expect(uploadAssets).toHaveBeenCalledTimes(1);
});

it('rejects a malformed server response instead of inserting an iframe', async () => {
  uploadAssets.mockResolvedValue({ asset: { ...asset, url: 'data:text/html,invalid' } });
  renderModal(); select();
  await screen.findByText('We could not upload the PDF. Try again.');
  expect(editor.insertContent).not.toHaveBeenCalled();
});

it('does not upload twice or close during an in-flight request', async () => {
  let finish;
  uploadAssets.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  renderModal(); select(); select();
  await waitFor(() => expect(uploadAssets).toHaveBeenCalledTimes(1));
  userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(close).not.toHaveBeenCalled();
  finish({ asset });
  await screen.findByText('PDF uploaded successfully');
});

it('escapes the accessible title and validates asset URL and dimensions', () => {
  const node = document.createElement('div');
  node.innerHTML = pdfHtml(asset, '"><script>alert(1)</script>', '700');
  expect(node.querySelector('script')).toBeNull();
  expect(node.querySelector('iframe').title).toBe('"><script>alert(1)</script>');
  expect(() => pdfAssetUrl({ ...asset, url: '//other.example/file.pdf' })).toThrow();
  expect(() => pdfHtml(asset, 'PDF', '700px')).toThrow();
});

it('limits the new plugin to course text while preserving image and iframe controls', () => {
  const text = pluginConfig({ editorType: 'text', isLibrary: false });
  expect(text.toolbar).toContain('academuspdf');
  expect(text.toolbar).toContain('academusremovepdf');
  expect(text.plugins).not.toContain('academusremovepdf');
  expect(text.toolbar).toContain('imageuploadbutton');
  expect(text.config.toolbar_groups.academusextras.items).toContain('embediframe');
  expect(pluginConfig({ editorType: 'text', isLibrary: true }).plugins).not.toContain('academuspdf');
  expect(pluginConfig({ editorType: 'question', isLibrary: false }).plugins).not.toContain('academuspdf');
});

it('reuses an existing course PDF without uploading and preserves its returned URL', async () => {
  renderModal();
  userEvent.click(screen.getByRole('tab', { name: 'Choose from Files & Uploads' }));
  userEvent.click(await screen.findByRole('button', { name: 'guide.pdf' }));
  await screen.findByText('PDF selected from Files & Uploads');
  userEvent.click(screen.getByRole('button', { name: 'Insert PDF' }));
  expect(uploadAssets).not.toHaveBeenCalled();
  expect(getAssetDetails).not.toHaveBeenCalled();
  expect(editor.insertContent).toHaveBeenCalledWith(pdfHtml(asset, 'guide.pdf', '700'));
});

it('clears the selection when switching tabs or choosing a different PDF', async () => {
  renderModal();
  userEvent.click(screen.getByRole('tab', { name: 'Choose from Files & Uploads' }));
  userEvent.click(await screen.findByRole('button', { name: 'guide.pdf' }));
  userEvent.click(screen.getByRole('button', { name: 'Choose another PDF' }));
  expect(screen.getByRole('button', { name: 'Insert PDF' })).toBeDisabled();
  userEvent.click(await screen.findByRole('button', { name: 'guide.pdf' }));
  userEvent.click(screen.getByRole('tab', { name: 'Upload PDF' }));
  expect(screen.getByRole('button', { name: 'Insert PDF' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Drag your PDF here' })).toBeInTheDocument();
});
