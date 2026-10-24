import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';

/**
 * Independent browser context: never overwrite the user's local saved document.
 * Run: EDITOR_URL=http://127.0.0.1:4182 node --test tests/docs-content-integrity-browser.mjs
 */
const url = process.env.EDITOR_URL || 'http://127.0.0.1:4182/';
const sessionKey = 'docs-editor-lab-session-v4';
const initial = {
  version: 2, title: 'Isolated Docs QA', comments: [], savedAt: new Date(0).toISOString(),
  doc: { type: 'doc', content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Docs QA anchor' }] },
    { type: 'paragraph' },
  ] },
};
const descendants = (node, result = []) => {
  if (!node || typeof node !== 'object') return result;
  result.push(node);
  for (const child of node.content || []) descendants(child, result);
  return result;
};
async function readSaved(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), sessionKey);
}
async function persisted(page, predicate, message) {
  await page.waitForFunction(({ key, kind, value }) => {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    const nodes = (node, out = []) => {
      if (node) { out.push(node); (node.content || []).forEach(child => nodes(child, out)); }
      return out;
    };
    return nodes(saved?.doc).some(node =>
      kind === 'heading' ? node.type === 'heading' && node.attrs?.level === 2 &&
        nodes(node).some(child => child.text?.includes(value)) :
      kind === 'equation' ? node.type === 'equation' && node.attrs?.latex === value :
      node.type === 'mediaBlock' && node.attrs?.kind === 'file' &&
        node.attrs?.label === value && node.attrs?.src === 'https://example.com/qa.pdf'
    );
  }, { key: sessionKey, ...predicate }, { timeout: 10000 }).catch(() => {
    throw new Error('Autosave did not persist ' + message);
  });
}
async function choose(page, label) {
  await page.getByRole('button', { name: 'Insert block' }).click();
  const menu = page.getByRole('dialog', { name: 'Insert a block' });
  await menu.waitFor({ state: 'visible' });
  await menu.getByRole('option', { name: label }).first().click();
}
for (const width of [1365, 390]) {
  test('Docs content integrity at ' + width + 'px', async () => {
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(({ key, session }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(session));
      }, { key: sessionKey, session: initial });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url, { waitUntil: 'networkidle' });
      const editor = page.locator('.ProseMirror');
      await editor.waitFor({ state: 'visible' });
      assert.equal(await editor.getByText('Docs QA anchor').count(), 1);

      await editor.locator(':scope > p').last().click();
      await choose(page, /Heading 2/);
      await page.keyboard.type('Caret survives + palette');
      await persisted(page, { kind: 'heading', value: 'Caret survives + palette' }, 'heading');
      assert.ok(await editor.locator('h2').filter({ hasText: 'Caret survives + palette' }).count());

      await page.keyboard.press('Enter');
      await choose(page, /^Equation\b/);
      const equation = editor.locator('[data-type="equation"]').last();
      const source = equation.getByRole('textbox', { name: 'Equation source' });
      await source.waitFor({ state: 'visible' });
      assert.equal(await source.evaluate(el => el === document.activeElement), true,
        'New equation must own focus rather than send typing to a previous editor control');
      await source.fill('E = mc^2');
      await equation.getByRole('button', { name: 'Save' }).click();
      await persisted(page, { kind: 'equation', value: 'E = mc^2' }, 'equation');

      await choose(page, /File attachment/);
      const file = editor.locator('[data-type="mediaBlock"]').last();
      await file.getByRole('textbox', { name: 'Media title' }).fill('QA Attachment');
      await file.getByRole('textbox', { name: 'Media URL' }).fill('https://example.com/qa.pdf');
      await file.getByRole('button', { name: 'Save' }).click();
      await persisted(page, { kind: 'file', value: 'QA Attachment' }, 'file attachment');
      const before = await readSaved(page);
      assert.equal(before.title, 'Isolated Docs QA');

      await page.reload({ waitUntil: 'networkidle' });
      const after = await readSaved(page);
      const nodes = descendants(after.doc);
      assert.ok(nodes.some(node => node.type === 'heading' && node.attrs?.level === 2 &&
        descendants(node, []).some(part => part.text === 'Caret survives + palette')));
      assert.ok(nodes.some(node => node.type === 'equation' && node.attrs?.latex === 'E = mc^2'));
      assert.ok(nodes.some(node => node.type === 'mediaBlock' && node.attrs?.label === 'QA Attachment'));
      assert.deepEqual(errors, [], 'No page errors while editing, saving and reloading');
      await context.close();
    } finally { await browser.close(); }
  });
}
