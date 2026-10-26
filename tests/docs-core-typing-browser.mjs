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

for (const width of [1365, 390]) {
  test('Core caret, typing, lists and slash at ' + width + 'px', async () => {
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(({ key, fixture }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(fixture));
      }, { key, fixture });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url, { waitUntil: 'networkidle' });
      const editor = page.locator('.ProseMirror');
      await editor.waitFor({ state: 'visible' });

      // Tab/Shift+Tab on a plain paragraph must change indent without moving focus.
      const first = editor.locator(':scope > p').first();
      await first.click();
      await page.keyboard.press('Home');
      await page.keyboard.press('Tab');
      assert.equal(await first.getAttribute('data-block-indent'), '1');
      assert.equal(await editor.evaluate(node => document.activeElement === node), true);
      await page.keyboard.press('Shift+Tab');
      assert.equal(await first.getAttribute('data-block-indent'), null);

      // Arrow, Backspace and Delete must edit at the caret rather than jump blocks.
      await first.click();
      await page.keyboard.press('Home');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Backspace');
      assert.equal(await first.innerText(), 'ACDE');
      await page.keyboard.press('Delete');
      assert.equal(await first.innerText(), 'ADE');

      // Enter creates a paragraph; writing continues there.
      await first.click();
      await page.keyboard.press('End');
      await page.keyboard.press('Enter');
      await page.keyboard.type('New paragraph');
      assert.match(await editor.locator(':scope > p').nth(1).innerText(), /New paragraph/);

      // Nest and lift a checklist item with Tab/Shift+Tab.
      const tasks = editor.locator('ul[data-type="taskList"] li[data-type="taskItem"]');
      await tasks.nth(1).locator('p').click();
      await page.keyboard.press('Home');
      await page.keyboard.press('Tab');
      assert.equal(await editor.locator('ul[data-type="taskList"] li[data-type="taskItem"]').count(), 2);
      assert.ok(await editor.locator('ul[data-type="taskList"] li[data-type="taskItem"] ul[data-type="taskList"]').count() > 0);
      await page.keyboard.press('Shift+Tab');
      assert.equal(await editor.locator('ul[data-type="taskList"] > li[data-type="taskItem"]').count(), 2);

      // Slash must perform a real conversion and return focus for subsequent typing.
      const empty = editor.locator(':scope > p').last();
      await empty.click();
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
