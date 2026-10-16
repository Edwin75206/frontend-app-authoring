import { getLocale } from '@edx/frontend-platform/i18n';
import pdfMessages from '../../PdfUploadModal/messages';

// Match course PDF references already used by Insert PDF, including reopened /static/ content.
// Leave unrelated external iframes and other embedded resources alone.
export const coursePdfFrames = editor => Array.from(editor.getBody()?.querySelectorAll('iframe') || [])
  .filter(frame => {
    const src = frame.getAttribute('src') || '';
    return /^\/(?:static\/|asset-v1:|assets\/courseware\/)/i.test(src)
      && (frame.getAttribute('data-academus-pdf') === 'true' || /\.pdf(?:[?#].*)?$/i.test(src));
  });

export const removePdfDialog = (editor, text) => {
  const frames = coursePdfFrames(editor);
  if (!frames.length) { return; }
  const selected = frames.indexOf(editor.selection.getNode());
  editor.windowManager.open({
    title: text.remove,
    body: {
      type: 'panel',
      items: [
        { type: 'htmlpanel', html: `<p>${text.removeHelp}</p>` },
        {
          type: 'selectbox',
          name: 'pdf',
          label: text.selectPdf,
          items: frames.map((frame, index) => ({
            text: `${index + 1}. ${frame.title || frame.getAttribute('src').split(/[/@]/).pop()}`,
            value: String(index),
          })),
        },
      ],
    },
    initialData: { pdf: String(Math.max(0, selected)) },
    buttons: [
      { type: 'cancel', name: 'cancel', text: text.cancel },
      {
        type: 'submit', name: 'remove', text: text.remove, primary: true,
      },
    ],
    onSubmit: (dialog) => {
      const frame = frames[Number(dialog.getData().pdf)];
      if (frame && coursePdfFrames(editor).includes(frame)) {
        editor.undoManager.transact(() => {
          editor.selection.select(frame);
          editor.selection.collapse(true);
          editor.dom.remove(frame);
        });
        editor.nodeChanged();
      }
      dialog.close();
    },
  });
};

export default function insertPdfPlugin(editor) {
  const open = () => editor.settings.academusPdfOpen?.({
    editor,
    bookmark: editor.selection.getBookmark(2, true),
  });
  const text = pdfMessages(getLocale());
  const label = text.insert;
  editor.ui.registry.addButton('academuspdf', {
    icon: 'document-properties', text: label, tooltip: label, onAction: open,
  });
  editor.ui.registry.addMenuItem('academuspdf', {
    icon: 'document-properties', text: label, onAction: open,
  });
  const remove = {
    text: text.remove,
    onAction: () => removePdfDialog(editor, text),
    onSetup: (api) => {
      const update = () => api.setDisabled(coursePdfFrames(editor).length === 0);
      const events = 'NodeChange SetContent change Undo Redo';
      update();
      editor.on(events, update);
      return () => editor.off(events, update);
    },
  };
  editor.ui.registry.addButton('academusremovepdf', { ...remove, tooltip: text.remove });
  editor.ui.registry.addMenuItem('academusremovepdf', remove);
}

if (window.tinymce) {
  window.tinymce.PluginManager.add('academuspdf', insertPdfPlugin);
}
