import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';

const url = process.env.EDITOR_URL || 'http://127.0.0.1:4182/';
const key = 'docs-editor-lab-session-v4';
const starting = { version: 2, title: 'Selection + slash isolated QA', comments: [],
  savedAt: new Date(0).toISOString(), doc: { type: 'doc', content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Selected text for styling' }] },
    { type: 'paragraph' },
  ] } };
const walk = (node, list = []) => { if (!node) return list; list.push(node);
  for (const part of node.content || []) walk(part, list); return list; };
const saved = page => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), key);
async function untilSaved(page, check) {
  await page.waitForFunction(({ key, check }) => {
    const snapshot = JSON.parse(localStorage.getItem(key) || 'null');
    if (!snapshot?.doc) return false;
    const nodes = (node, list = []) => { if (node) { list.push(node); (node.content || []).forEach(n => nodes(n, list)); } return list; };
    const all = nodes(snapshot.doc);
    // ProseMirror JSON omits marks entirely when none remain after Undo; absence means unmarked.
    if (check.kind === 'bold') return all.some(n => n.type === 'text' && n.text === 'Selected text for styling' &&
      (n.marks ?? []).some(m => m.type === 'bold') === check.present);
    if (check.kind === 'quote') return all.filter(n => n.type === 'blockquote' && nodes(n).some(t => t.text === 'Quote via slash')).length === check.count;
    if (check.kind === 'timeline') return all.some(n => n.type === 'docsTimeline' && n.attrs?.source === check.source);
    if (check.kind === 'color') return all.some(n => n.text === 'Selected text for styling' && n.marks?.some(m => m.type === 'textStyle' && m.attrs?.color === check.value));
    if (check.kind === 'heading') return all.some(n => n.type === 'heading' && n.attrs?.level === 7 && nodes(n).some(t => t.text === 'Quote via slash'));
    return false;
  }, { key, check }, { timeout: 12000 });
}
async function chooseBlock(page) {
  await page.getByRole('button', { name: 'Insert block' }).click();
  const dialog = page.getByRole('dialog', { name: 'Insert a block' });
  await dialog.waitFor({ state: 'visible' });
  // The option's accessible name includes its description as well as its label.
  await dialog.getByRole('option', { name: /^Timeline/ }).click();
}
async function selectParagraph(page) {
  const dismiss = page.getByRole('button', { name: 'Close formatting toolbar' });
  if (await dismiss.isVisible()) {
    await dismiss.click();
    await page.locator('.docs-selection-toolbar').waitFor({ state: 'hidden' });
  }
  // Place a real caret in the paragraph, then extend the range with keyboard
  // navigation; this reselects the same text reliably after Undo/Redo.
  const paragraph = page.locator('.ProseMirror > p').filter({ hasText: 'Selected text for styling' });
  await paragraph.click();
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+End');
  await page.waitForFunction(() =>
    window.getSelection()?.toString().trim() === 'Selected text for styling',
  );
  await page.getByRole('toolbar', { name: 'Selection formatting' }).waitFor({ state: 'visible' });
}
for (const width of [1365, 390]) {
  test(`Docs selection, slash, context and history at ${width}px`, async () => {
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(({ key, starting }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(starting));
      }, { key, starting });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
      const undo = async () => width > 1200 ? page.getByRole('button', { name: 'Undo' }).click() : page.keyboard.press(`${mod}+z`);
      const redo = async () => width > 1200 ? page.getByRole('button', { name: 'Redo' }).click() : page.keyboard.press(`${mod}+Shift+z`);
      await page.goto(url, { waitUntil: 'networkidle' });
      const editor = page.locator('.ProseMirror');
      await editor.waitFor({ state: 'visible' });
      const initialEmptyParagraph = editor.locator(':scope > p').last();
      await initialEmptyParagraph.click();
      await page.waitForFunction(() => document.querySelector('.ProseMirror > p:last-child')?.hasAttribute('data-docs-placeholder'));
      const placeholder = await initialEmptyParagraph.getAttribute('data-docs-placeholder');
      assert.match(placeholder || '', /\/.*(commands|l\u1ec7nh)/i, 'Empty focused paragraphs should explain the slash command shortcut');
      assert.notEqual(await initialEmptyParagraph.evaluate(node => getComputedStyle(node, '::before').content), 'none');
      await selectParagraph(page);
      const floating = page.locator('.docs-selection-toolbar');
      const toolbar = floating.getByRole('toolbar', { name: 'Selection formatting' });
      await toolbar.waitFor({ state: 'visible' });
      await toolbar.getByRole('button', { name: 'Bold' }).click();
      await untilSaved(page, { kind: 'bold', present: true });
      await undo();
      await untilSaved(page, { kind: 'bold', present: false });
      await redo();
      await untilSaved(page, { kind: 'bold', present: true });

      await selectParagraph(page);
      await toolbar.getByRole('button', { name: 'Text color', exact: true }).click();
      // The palette is a sibling of role=toolbar, inside the same floating root.
      const palette = floating.locator('.docs-selection-panel');
      await palette.waitFor({ state: 'visible' });
      await palette.getByRole('button', { name: 'Text color #d83931', exact: true }).click();
      await untilSaved(page, { kind: 'color', value: '#d83931' });
      await palette.waitFor({ state: 'hidden' });
      const colored = walk((await saved(page)).doc).find(n => n.text === 'Selected text for styling');
      assert.ok(colored?.marks?.some(mark => mark.type === 'textStyle' && mark.attrs?.color === '#d83931'));
      const emptyParagraph = editor.locator(':scope > p').last();
      // On mobile a floating toolbar must not cover the next editable line.
      await emptyParagraph.click();
      await floating.waitFor({ state: 'hidden' });
      await page.keyboard.type('/quote');
      const slash = page.getByRole('menu', { name: 'Insert block' });
      await slash.waitFor({ state: 'visible' });
      await slash.getByRole('menuitem', { name: /^Quote/ }).click();
      await page.keyboard.type('Quote via slash');
      await untilSaved(page, { kind: 'quote', count: 1 });
      const quote = editor.locator('blockquote').filter({ hasText: 'Quote via slash' }).last();
      await quote.click({ button: 'right' });
      const menu = page.getByRole('menu', { name: 'Block actions' });
      await menu.waitFor({ state: 'visible' });
      await menu.getByRole('menuitem', { name: /^Duplicate/ }).click();
      await untilSaved(page, { kind: 'quote', count: 2 });
      await undo();
      await untilSaved(page, { kind: 'quote', count: 1 });
      await redo();
      await untilSaved(page, { kind: 'quote', count: 2 });
      const order = (await saved(page)).doc.content.filter(n => n.type === 'blockquote').map(n => n.attrs.blockId);
      assert.equal(order.length, 2);
      assert.notEqual(order[0], order[1], 'Duplicated blocks need independent identities');
      await editor.locator('blockquote').last().click({ button: 'right' });
      await menu.getByRole('menuitem', { name: 'Move block up' }).click();
      await page.waitForFunction(({key,order}) => {
        const n = JSON.parse(localStorage.getItem(key) || 'null')?.doc?.content?.filter(n => n.type === 'blockquote') || [];
        return n.length === 2 && n[0].attrs?.blockId === order[1] && n[1].attrs?.blockId === order[0];
      }, {key,order});
      await undo();
      await page.waitForFunction(({key,order}) => {
        const n = JSON.parse(localStorage.getItem(key) || 'null')?.doc?.content?.filter(n => n.type === 'blockquote') || [];
        return n.length === 2 && n[0].attrs?.blockId === order[0] && n[1].attrs?.blockId === order[1];
      }, {key,order});
      await redo();
      await editor.locator('blockquote').last().click({ button: 'right' });
      await menu.getByRole('menuitem', { name: /^Delete/ }).click();
      await untilSaved(page, { kind: 'quote', count: 1 });
      await editor.locator('blockquote').last().click({ button: 'right' });
      await menu.getByRole('menuitem', { name: 'Turn into' }).click();
      const headingSeven = menu.getByRole('menuitem', { name: 'Heading 7', exact: true });
      await headingSeven.waitFor({ state: 'visible' });
      await headingSeven.click();
      await untilSaved(page, { kind: 'heading' });
      assert.equal(await editor.locator('[data-heading-level="7"]').count(), 1);
      await chooseBlock(page);
      const timeline = editor.locator('[data-type="docsTimeline"]').last();
      const timelineSource = timeline.getByRole('textbox', { name: 'Timeline items' });
      await timelineSource.waitFor({ state: 'visible' });
      const oldSource = await timelineSource.inputValue();
      await timelineSource.fill('Q1 | Draft | Docs QA\nQ2 | Review | Docs QA');
      await timeline.getByRole('button', { name: 'Apply' }).click();
      await untilSaved(page, { kind: 'timeline', source: 'Q1 | Draft | Docs QA\nQ2 | Review | Docs QA' });
      await editor.locator(':scope > p').last().click();
      await undo();
      await untilSaved(page, { kind: 'timeline', source: oldSource });
      assert.equal(await timelineSource.inputValue(), oldSource, 'Draft source reflects Undo');
      await redo();
      await untilSaved(page, { kind: 'timeline', source: 'Q1 | Draft | Docs QA\nQ2 | Review | Docs QA' });
      const snapshot = await saved(page);
      await page.reload({ waitUntil: 'networkidle' });
      const restored = await saved(page);
      assert.deepEqual(restored.doc, snapshot.doc);
      assert.deepEqual(errors, []);
      await context.close();
    } finally { await browser.close(); }
  });
}
