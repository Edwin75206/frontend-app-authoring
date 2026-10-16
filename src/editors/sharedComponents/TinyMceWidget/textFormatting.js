// Native TinyMCE 5 options, applied only to the course Text editor.
// Font stacks use installed system fonts; no web fonts or new content CSS.
export const formattingPlugins = 'searchreplace fullscreen preview';

export const formattingToolbar = 'undo redo | formatselect | fontselect fontsizeselect | bold italic underline forecolor backcolor | academusparagraph | imageuploadbutton academuspdf academusremovepdf link | table | academusextras';

export const formattingOptions = {
  menubar: 'format insert tools',
  // TinyMCE 5 wraps multiple toolbars instead of overflowing them. Native groups
  // need floating mode and keep the same controls usable on narrow screens.
  toolbar_mode: 'floating',
  toolbar_groups: {
    academusparagraph: {
      icon: 'align-left',
      tooltip: 'Paragraph',
      items: 'alignleft aligncenter alignright alignjustify | bullist numlist outdent indent blockquote',
    },
    academusextras: {
      icon: 'more-drawer',
      tooltip: 'More...',
      items: 'codeBlock embediframe code-modified a11ycheck',
    },
  },
  menu: {
    format: {
      title: 'Format',
      items: 'strikethrough superscript subscript | removeformat',
    },
    insert: {
      title: 'Insert',
      items: 'charmap emoticons hr',
    },
    tools: {
      title: 'Tools',
      items: 'searchreplace | fullscreen preview',
    },
  },
  font_formats: [
    'Arial=arial,helvetica,sans-serif',
    'Helvetica=helvetica,arial,sans-serif',
    'Verdana=verdana,geneva,sans-serif',
    'Tahoma=tahoma,arial,helvetica,sans-serif',
    'Trebuchet MS=trebuchet ms,geneva,sans-serif',
    'Georgia=georgia,palatino,serif',
    'Times New Roman=times new roman,times,serif',
    'Courier New=courier new,courier,monospace',
  ].join(';'),
  fontsize_formats: '10pt 12pt 14pt 16pt 18pt 20pt 24pt 28pt 32pt 36pt 48pt',
  // Retain TinyMCE's existing table dialog, context menu and row/column toolbar.
  table_toolbar: 'tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol',
};
