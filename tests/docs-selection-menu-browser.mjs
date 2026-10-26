import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';

const url = process.env.EDITOR_URL || 'http://127.0.0.1:4182/';
const key = 'docs-editor-lab-session-v4';
const starting = { version: 2, title: 'Selection + slash isolated QA', comments: [],
  savedAt: new Date(0).toISOString(), doc: { type: 'doc', content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Selected text for styling' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Comment target' }] }, { type: 'paragraph' },
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
    if (check.kind === 'align') return all.some(n => n.type === 'paragraph' && n.attrs?.textAlign === check.value && nodes(n).some(t => t.text === 'Selected text for styling'));
    if (check.kind === 'indent') return all.some(n => n.type === 'paragraph' && n.attrs?.blockIndent === check.value && nodes(n).some(t => t.text === 'Selected text for styling'));
    if (check.kind === 'link') return all.some(n => n.type === 'text' && n.text === 'Selected text for styling' &&
      (n.marks ?? []).some(m => m.type === 'link' && m.attrs?.href === check.href) === check.present);
    if (check.kind === 'comment') return (snapshot.comments ?? []).some(comment => comment.text === check.text) === check.present;
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
async function selectParagraph(page, value = 'Selected text for styling') {
  const dismiss = page.getByRole('button', { name: 'Close formatting toolbar' });
  if (await dismiss.isVisible()) {
    await dismiss.click();
    await page.locator('.docs-selection-toolbar').waitFor({ state: 'hidden' });
  }
  const paragraph = page.locator('.ProseMirror > p').filter({ hasText: value });
  await paragraph.click();
  await paragraph.selectText();
  await page.waitForFunction(expected => window.getSelection()?.toString().trim() === expected, value);
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
      await toolbar.getByRole('button', { name: 'Link' }).click();
      const linkDialog = page.getByRole('dialog', { name: 'Edit link' });
      await linkDialog.waitFor({ state: 'visible' });
      await linkDialog.getByRole('button', { name: 'Cancel' }).click();
      await linkDialog.waitFor({ state: 'hidden' });
      await toolbar.waitFor({ state: 'visible' });
      await page.waitForFunction(() => window.getSelection()?.toString().trim() === 'Selected text for styling');
      const linkHref = 'https://example.test/docs';
      await toolbar.getByRole('button', { name: 'Link' }).click();
      await linkDialog.getByLabel('Link URL').fill(linkHref);
      await linkDialog.getByRole('button', { name: 'Save' }).click();
      await linkDialog.waitFor({ state: 'hidden' });
      await untilSaved(page, { kind: 'link', href: linkHref, present: true });
      await toolbar.waitFor({ state: 'visible' });
      assert.equal(await page.evaluate(() => window.getSelection()?.toString().trim()), 'Selected text for styling',
        'Applying a link restores the selected text and formatting toolbar');
      await undo();
      await untilSaved(page, { kind: 'link', href: linkHref, present: false });
      await redo();
      await untilSaved(page, { kind: 'link', href: linkHref, present: true });
      if (width <= 1000) await toolbar.waitFor({ state: 'visible' });
      await undo();
      await untilSaved(page, { kind: 'link', href: linkHref, present: false });

      await selectParagraph(page, 'Comment target');
      await toolbar.getByRole('button', { name: 'Comment' }).click();
      const commentDialog = page.getByRole('dialog', { name: 'Add comment' });
      await commentDialog.waitFor({ state: 'visible' });
      await commentDialog.getByRole('button', { name: 'Cancel' }).click();
      await commentDialog.waitFor({ state: 'hidden' });
      await toolbar.waitFor({ state: 'visible' });
      await page.waitForFunction(() => window.getSelection()?.toString().trim() === 'Comment target');
      const commentText = 'Please keep this wording.';
      await toolbar.getByRole('button', { name: 'Comment' }).click();
      await commentDialog.getByLabel('Comment').fill(commentText);
      await commentDialog.getByRole('button', { name: 'Add comment' }).click();
      await commentDialog.waitFor({ state: 'hidden' });
      await untilSaved(page, { kind: 'comment', text: commentText, present: true });
      await toolbar.waitFor({ state: 'visible' });
      assert.equal(await page.evaluate(() => window.getSelection()?.toString().trim()), 'Comment target',
        'Adding a comment restores the selected text and formatting toolbar');
      assert.equal(await page.locator('.docs-comments-panel').getByText(commentText, { exact: true }).count(), 1,
        'Adding a comment opens its visible thread');
      if (width > 1200) {
        const selectedParagraph = editor.locator(':scope > p').filter({ hasText: 'Comment target' });
        const textBox = await selectedParagraph.evaluate(paragraph => {
          const range = document.createRange(); range.selectNodeContents(paragraph);
          const rect = range.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        });
        assert.ok(textBox.width > 0 && textBox.height > 0);
        const dragY = textBox.y + textBox.height / 2;
        await page.mouse.click(textBox.x + 1, dragY);
        await page.mouse.move(textBox.x + 1, dragY);
        await page.mouse.down();
        await page.mouse.move(textBox.x + textBox.width - 1, dragY, { steps: 8 });
        await page.mouse.up();
        await page.waitForFunction(() => window.getSelection()?.toString().trim() === 'Comment target');
        await toolbar.waitFor({ state: 'visible' });
      }
      await page.getByRole('button', { name: 'Close comments' }).click();
      await page.locator('.docs-comments-panel').waitFor({ state: 'hidden' });
      const closeToolbar = toolbar.getByRole('button', { name: 'Close formatting toolbar' });
      if (await closeToolbar.isVisible()) await closeToolbar.click();
      await floating.waitFor({ state: 'hidden' });
      await selectParagraph(page);
      const alignment = toolbar.getByRole('button', { name: 'Text alignment' });
      assert.ok(await alignment.isVisible(), 'Alignment should be directly available like Lark');
      const beforePopover = await floating.boundingBox(), beforeScroll = await page.evaluate(() => window.scrollY);
      await alignment.click();
      const alignmentMenu = floating.getByRole('menu', { name: 'Text alignment' });
      await alignmentMenu.waitFor({ state: 'visible' });
      await alignmentMenu.getByRole('menuitemradio', { name: 'Align center' }).click();
      await untilSaved(page, { kind: 'align', value: 'center' });
      await alignment.click();
      await alignmentMenu.getByRole('menuitemradio', { name: 'Align left' }).click();
      await untilSaved(page, { kind: 'align', value: 'left' });
      await alignment.click();
      await alignmentMenu.getByRole('menuitem', { name: 'Increase indent' }).click();
      await untilSaved(page, { kind: 'indent', value: 1 });
      await alignment.click();
      await alignmentMenu.getByRole('menuitem', { name: 'Decrease indent' }).click();
      await untilSaved(page, { kind: 'indent', value: 0 });
      const afterAlignment = await floating.boundingBox();
      assert.ok(beforePopover && afterAlignment && Math.abs(beforePopover.y - afterAlignment.y) < 1,
        'Opening and using the alignment popover must not move the floating bar');
      assert.equal(await page.evaluate(() => window.scrollY), beforeScroll, 'Formatting controls must not scroll the document');
      await toolbar.getByRole('button', { name: 'More formatting' }).click();
      const beforeMore = await floating.boundingBox();
      await floating.locator('.docs-selection-panel').waitFor({ state: 'visible' });
      const afterMore = await floating.boundingBox();
      assert.ok(beforeMore && afterMore && Math.abs(beforeMore.width - afterMore.width) < 1 && Math.abs(beforeMore.x - afterMore.x) < 1,
        'Opening More must overlay the compact toolbar without resizing or shifting it');
      await toolbar.getByRole('button', { name: 'More formatting' }).click();
      await floating.locator('.docs-selection-panel').waitFor({ state: 'hidden' });
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
      assert.equal(restored.comments?.length, snapshot.comments?.length, 'Comment thread count persists after reload');
      assert.equal(restored.comments?.[0]?.text, snapshot.comments?.[0]?.text, 'Comment text persists after reload');
      assert.equal(restored.comments?.[0]?.excerpt, snapshot.comments?.[0]?.excerpt, 'Comment anchor text persists after reload');
      assert.equal(await page.locator('.ProseMirror .comment-anchor').count(), 1, 'Comment anchor is restored with its thread');
      assert.deepEqual(errors, []);
      await context.close();
    } finally { await browser.close(); }
  });
}
