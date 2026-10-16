import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { initializeMockApp } from '@edx/frontend-platform';
import ExistingPdfPicker from './ExistingPdfPicker';
import { getAssets } from '../../../files-and-videos/files-page/data/api';

jest.mock('../../../files-and-videos/files-page/data/api', () => ({ getAssets: jest.fn() }));

const pdf = {
  id: 'one', displayName: 'Guide.pdf', contentType: 'application/pdf', url: '/asset-v1:course+type@asset+block@Guide.pdf',
};
const second = { ...pdf, id: 'two', displayName: 'Second.pdf' };
const renderPicker = (onSelect = jest.fn()) => render(
  <IntlProvider locale="en"><ExistingPdfPicker courseId="course-key" onSelect={onSelect} /></IntlProvider>,
);

beforeEach(() => { jest.clearAllMocks(); getAssets.mockReset(); initializeMockApp(); });

it('uses every API page, lists only PDFs, deduplicates IDs and returns original metadata', async () => {
  const image = {
    ...pdf, id: 'image', displayName: 'image.png', contentType: 'image/png',
  };
  getAssets.mockResolvedValueOnce({ assets: [image, pdf], pageSize: 2, totalCount: 4 });
  getAssets.mockResolvedValueOnce({ assets: [pdf, second], pageSize: 2, totalCount: 4 });
  const select = jest.fn();
  renderPicker(select);
  userEvent.click(await screen.findByRole('button', { name: 'Second.pdf' }));
  expect(select).toHaveBeenCalledWith(second);
  expect(screen.getAllByRole('button', { name: 'Guide.pdf' })).toHaveLength(1);
  expect(screen.queryByRole('button', { name: 'image.png' })).not.toBeInTheDocument();
  expect(getAssets.mock.calls).toEqual([['course-key', 0], ['course-key', 1]]);
});

it('searches the loaded PDFs by name without case sensitivity', async () => {
  getAssets.mockResolvedValue({ assets: [pdf, second], pageSize: 50, totalCount: 2 });
  renderPicker();
  await screen.findByRole('button', { name: 'Guide.pdf' });
  userEvent.type(screen.getByLabelText('Search PDF by name'), 'SECOND');
  expect(screen.queryByRole('button', { name: 'Guide.pdf' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Second.pdf' })).toBeInTheDocument();
  userEvent.type(screen.getByLabelText('Search PDF by name'), 'missing');
  expect(screen.getByText('No PDFs match this name.')).toBeInTheDocument();
});

it('handles an empty course and rejects unsafe URLs', async () => {
  getAssets.mockResolvedValue({ assets: [{ ...pdf, url: '//external.test/file.pdf' }], pageSize: 50, totalCount: 1 });
  renderPicker();
  await screen.findByText('There are no PDFs in this course yet. Use Upload PDF to add one.');
  expect(screen.queryByRole('button', { name: 'Guide.pdf' })).not.toBeInTheDocument();
});

it('shows a listing error and supports retry', async () => {
  getAssets.mockRejectedValueOnce(new Error('network'));
  getAssets.mockResolvedValueOnce({ assets: [pdf], pageSize: 50, totalCount: 1 });
  renderPicker();
  userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  await screen.findByRole('button', { name: 'Guide.pdf' });
  expect(getAssets).toHaveBeenCalledTimes(2);
});

it('stops loading further pages after the picker unmounts', async () => {
  let finish;
  getAssets.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const { unmount } = renderPicker();
  await waitFor(() => expect(getAssets).toHaveBeenCalledTimes(1));
  unmount();
  finish({ assets: [pdf], pageSize: 1, totalCount: 2 });
  await Promise.resolve();
  expect(getAssets).toHaveBeenCalledTimes(1);
});
