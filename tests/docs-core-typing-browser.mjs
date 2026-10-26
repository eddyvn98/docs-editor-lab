import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';

const url = process.env.EDITOR_URL || 'http://127.0.0.1:4183/';
const key = 'docs-editor-lab-session-v4';
const p = value => value ? { type: 'paragraph', content: [{ type: 'text', text: value }] } : { type: 'paragraph' };
const task = value => ({ type: 'taskItem', attrs: { checked: false }, content: [p(value)] });
const fixture = { version: 2, title: 'Docs core typing QA', comments: [], savedAt: new Date(0).toISOString(),
  doc: { type: 'doc', content: [
    p('ABCDE'), p('Second paragraph'),
    { type: 'taskList', content: [task('Task first'), task('Task second')] }, p(''),
  ] } };
const documentJSON = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null')?.doc, key);
/** Click at a concrete DOM Range caret; never use Home/End for QA positions. */
async function clickCaret(page, locator, offset) {
  await locator.scrollIntoViewIfNeeded();
  const point = await locator.evaluate((element, index) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode(), left = index;
    while (node && left > (node.textContent?.length || 0)) {
      left -= node.textContent?.length || 0;
      node = walker.nextNode();
    }
    if (!node || left > (node.textContent?.length || 0)) throw Error('Invalid caret offset');
    const range = document.createRange();
    range.setStart(node, left); range.collapse(true);
    const rect = range.getBoundingClientRect();
    return { x: rect.left, y: rect.top + rect.height / 2 };
  }, offset);
  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(80); // allow ProseMirror pointerup + next animation frame
  await assertCaret(page, locator, offset);
}
async function assertCaret(page, locator, offset) {
  const result = await locator.evaluate((element, expected) => {
    const native = window.getSelection(), pm = window.__docsQaSelection?.();
    let nativeOffset = -1;
    if (native?.isCollapsed && native.anchorNode && element.contains(native.anchorNode)) {
      const range = document.createRange();
      range.selectNodeContents(element);
      range.setEnd(native.anchorNode, native.anchorOffset);
      nativeOffset = range.toString().length;
    }
    return { nativeOffset, pm, expected };
  }, offset);
  assert.equal(result.nativeOffset, offset, 'Browser-native caret must reach the expected text offset');
  assert.ok(result.pm, 'QA inspection hook must be enabled');
  assert.equal(result.pm.from, result.pm.to, 'ProseMirror selection must be collapsed');
  assert.equal(result.pm.fromParent, 'paragraph', 'ProseMirror must target the clicked textblock');
  assert.equal(result.pm.fromOffset, offset,
    'ProseMirror caret must agree with native DOM caret immediately after pointerup');
}

for (const width of [1365, 390]) {
  test('Core caret, typing, lists and slash at ' + width + 'px', async () => {
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(({ key, fixture }) => {
        window.__docsQaInspect = true;
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(fixture));
      }, { key, fixture });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url, { waitUntil: 'networkidle' });
      const editor = page.locator('.ProseMirror');
      await editor.waitFor({ state: 'visible' });

      // Tab/Shift+Tab on a plain paragraph must change indent without moving focus.
      const first = editor.locator(':scope > p').first();
      await clickCaret(page, first, 0);
      await page.keyboard.press('Tab');
      assert.equal(await first.getAttribute('data-block-indent'), '1');
      assert.equal(await editor.evaluate(node => document.activeElement === node), true);
      await page.keyboard.press('Shift+Tab');
      assert.equal(await first.getAttribute('data-block-indent'), null);

      // Arrow, Backspace and Delete must edit at the caret rather than jump blocks.
      await clickCaret(page, first, 2);
      await page.keyboard.press('ArrowLeft');
      await assertCaret(page, first, 1);
      await page.keyboard.press('ArrowRight');
      await assertCaret(page, first, 2);
      await page.keyboard.press('Backspace');
      assert.equal(await first.innerText(), 'ACDE');
      await assertCaret(page, first, 1);
      await page.keyboard.press('Delete');
      assert.equal(await first.innerText(), 'ADE');

      // Enter creates a paragraph; writing continues there.
      await clickCaret(page, first, 3);
      await page.keyboard.press('Enter');
      await page.keyboard.type('New paragraph');
      assert.match(await editor.locator(':scope > p').nth(1).innerText(), /New paragraph/);

      // Backspace at the start of a paragraph joins it with the previous paragraph.
      const nextParagraph = editor.locator(':scope > p').nth(2);
      await clickCaret(page, nextParagraph, 0);
      await page.keyboard.press('Backspace');
      const joinedParagraph = editor.locator(':scope > p').nth(1);
      assert.equal(await joinedParagraph.innerText(), 'New paragraphSecond paragraph');
      assert.equal(await editor.locator(':scope > p').count(), 3);
      await assertCaret(page, joinedParagraph, 'New paragraph'.length);

      // Nest and lift a checklist item with Tab/Shift+Tab.
      const tasks = editor.locator('ul[data-type="taskList"] li[data-checked]');
      await clickCaret(page, tasks.nth(1).locator('p'), 0);
      const beforeTaskIndent = await editor.locator(':scope > p').evaluateAll(nodes =>
        nodes.map(node => node.getAttribute('data-block-indent')));
      await page.keyboard.press('Tab');
      assert.deepEqual(await editor.locator(':scope > p').evaluateAll(nodes =>
        nodes.map(node => node.getAttribute('data-block-indent'))), beforeTaskIndent,
        'Checklist Tab must not indent or replace an unrelated paragraph');
      assert.equal(await editor.locator('ul[data-type="taskList"] li[data-checked]').count(), 2);
      assert.ok(await editor.locator('ul[data-type="taskList"] li[data-checked] ul[data-type="taskList"]').count() > 0,
        'Tab nests the second task beneath the first');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await editor.locator('ul[data-type="taskList"] > li[data-checked]').count(), 2);

      // Slash must perform a real conversion and return focus for subsequent typing.
      const empty = editor.locator(':scope > p').last();
      await empty.click();
      await page.waitForTimeout(80);
      await assertCaret(page, empty, 0);
      await page.keyboard.type('/quote');
      const slash = page.getByRole('menu', { name: 'Insert block' });
      await slash.waitFor({ state: 'visible' });
      await slash.getByRole('menuitem', { name: /^Quote/ }).click();
      await page.keyboard.type('Slash content');
      assert.ok(await editor.locator('blockquote').filter({ hasText: 'Slash content' }).count());

      // Autosave, reload and keyboard input leave document structure intact.
      await page.waitForFunction(key => {
        const doc = JSON.parse(localStorage.getItem(key) || 'null')?.doc;
        return doc && JSON.stringify(doc).includes('Slash content') && JSON.stringify(doc).includes('New paragraph');
      }, key);
      const before = await documentJSON(page);
      await page.reload({ waitUntil: 'networkidle' });
      assert.deepEqual(await documentJSON(page), before);
      assert.deepEqual(errors, [], 'No browser runtime errors');
      await context.close();
    } finally { await browser.close(); }
  });
}
