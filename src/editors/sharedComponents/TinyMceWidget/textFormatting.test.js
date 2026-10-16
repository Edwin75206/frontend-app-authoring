import pluginConfig from './pluginConfig';
import { formattingOptions, formattingPlugins, formattingToolbar } from './textFormatting';

test('course Text enables native tools, responsive groups and limited fonts/sizes', () => {
  const text = pluginConfig({ editorType: 'text', isLibrary: false });
  expect(text.toolbar).toEqual(formattingToolbar);
  expect(typeof text.toolbar).toBe('string');
  expect(text.config).toMatchObject(formattingOptions);
  expect(text.config.toolbar_mode).toBe('floating');
  expect(text.config.font_formats.split(';').map(font => font.split('=')[0])).toEqual([
    'Arial', 'Helvetica', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Georgia', 'Times New Roman', 'Courier New',
  ]);
  expect(text.config.fontsize_formats).toBe('10pt 12pt 14pt 16pt 18pt 20pt 24pt 28pt 32pt 36pt 48pt');
  formattingPlugins.split(' ').forEach(plugin => expect(text.plugins.split(' ')).toContain(plugin));
  const tools = [text.toolbar, ...Object.values(text.config.toolbar_groups).map(group => group.items)].join(' ').split(' ');
  ['academuspdf', 'academusremovepdf', 'imageuploadbutton', 'embediframe', 'code-modified', 'table', 'link', 'blockquote', 'codeBlock']
    .forEach(button => expect(tools).toContain(button));
  expect(text.config.convert_urls).toBe(false);
  expect(text.config).not.toHaveProperty('style_formats');
});

test.each([
  ['text', true], ['question', false], ['expandable', false], ['problem', false],
])('%s library=%s retains its original configuration', (editorType, isLibrary) => {
  const editor = pluginConfig({ editorType, isLibrary });
  expect(editor.config.menubar).toBe(false);
  expect(editor.config).not.toHaveProperty('font_formats');
  expect(Array.isArray(editor.toolbar)).toBe(false);
  formattingPlugins.split(' ').forEach(plugin => expect(editor.plugins.split(' ')).not.toContain(plugin));
});
