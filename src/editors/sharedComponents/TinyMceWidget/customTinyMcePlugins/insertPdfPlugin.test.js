import { initializeMockApp } from '@edx/frontend-platform';
import insertPdfPlugin, { coursePdfFrames, removePdfDialog } from './insertPdfPlugin';
import pdfMessages from '../../PdfUploadModal/messages';

const text = pdfMessages('en');
let body;
let editor;

beforeEach(() => {
  initializeMockApp();
  body = document.createElement('div');
  body.innerHTML = '<p>Before<iframe src="/static/one.pdf" title="One"></iframe>After</p>'
    + '<iframe src="/asset-v1:course+type@asset+block@two.pdf" title="Two"></iframe>'
    + '<iframe src="https://external.test/video"></iframe><img src="/static/image.png">';
  editor = {
    getBody: () => body,
    settings: { academusPdfOpen: jest.fn() },
    selection: {
      getNode: jest.fn(() => body), getBookmark: jest.fn(), select: jest.fn(), collapse: jest.fn(),
    },
    undoManager: { transact: jest.fn(fn => fn()) },
    dom: { remove: jest.fn(node => node.remove()) },
    windowManager: { open: jest.fn() },
    ui: { registry: { addButton: jest.fn(), addMenuItem: jest.fn() } },
    nodeChanged: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  };
});

it('detects only course PDFs and recognizes marked PDF assets without an extension', () => {
  body.innerHTML += '<iframe src="/assets/courseware/v1/hash/file" data-academus-pdf="true"></iframe>'
    + '<iframe src="https://external.test/doc.pdf"></iframe>'
    + '<iframe src="/static/video.mp4"></iframe>';
  expect(coursePdfFrames(editor)).toHaveLength(3);
});

it('lists PDF titles, defaults to the selected frame and removes only that iframe in an undo transaction', () => {
  const frames = coursePdfFrames(editor);
  editor.selection.getNode.mockReturnValue(frames[1]);
  removePdfDialog(editor, text);
  const dialog = editor.windowManager.open.mock.calls[0][0];
  expect(dialog.initialData).toEqual({ pdf: '1' });
  expect(dialog.body.items[1].items).toEqual([{ text: '1. One', value: '0' }, { text: '2. Two', value: '1' }]);
  const close = jest.fn();
  dialog.onSubmit({ getData: () => ({ pdf: '0' }), close });
  expect(editor.undoManager.transact).toHaveBeenCalledTimes(1);
  expect(editor.dom.remove).toHaveBeenCalledWith(frames[0]);
  expect(body.querySelector('p').textContent).toBe('BeforeAfter');
  expect(body.contains(frames[1])).toBe(true);
  expect(body.querySelector('img')).not.toBeNull();
  expect(body.querySelector('iframe[src^="https:"]')).not.toBeNull();
  expect(close).toHaveBeenCalledTimes(1);
});

it('does nothing if the dialog selection no longer exists', () => {
  removePdfDialog(editor, text);
  coursePdfFrames(editor)[0].remove();
  editor.windowManager.open.mock.calls[0][0].onSubmit({ getData: () => ({ pdf: '0' }), close: jest.fn() });
  expect(editor.dom.remove).not.toHaveBeenCalled();
});

it('registers accessible controls, disables removal with no PDFs and cleans up listeners', () => {
  insertPdfPlugin(editor);
  const button = editor.ui.registry.addButton.mock.calls.find(([name]) => name === 'academusremovepdf')[1];
  const api = { setDisabled: jest.fn() };
  const cleanup = button.onSetup(api);
  expect(api.setDisabled).toHaveBeenLastCalledWith(false);
  coursePdfFrames(editor).forEach(frame => frame.remove());
  editor.on.mock.calls[0][1]();
  expect(api.setDisabled).toHaveBeenLastCalledWith(true);
  cleanup();
  expect(editor.off).toHaveBeenCalledWith(...editor.on.mock.calls[0]);
});

it('does not open an empty removal dialog', () => {
  coursePdfFrames(editor).forEach(frame => frame.remove());
  removePdfDialog(editor, text);
  expect(editor.windowManager.open).not.toHaveBeenCalled();
});
