import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';

const url = process.env.EDITOR_URL || 'http://127.0.0.1:4183/';
const key = 'docs-editor-lab-session-v4';
const text = value => ({ type: 'text', text: value });
const paragraph = value => ({ type: 'paragraph', content: [text(value)] });
const fixture = { version: 2, title: 'Docs core surface QA', comments: [],
  doc: { type: 'doc', content: [
    paragraph('Bold, italic, underline, strike, inline code, link, highlight, and comments.'),
    { type: 'callout', content: [paragraph('Callout color control')] },
    { type: 'codeBlock', attrs: { language: 'typescript' },
      content: [text('const retained = true;')] },
    { type: 'paragraph' },
  ] } };
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null')?.doc, key);

for (const width of [1365, 390]) {
  test('H3, Callout and Code remain independent at ' + width + 'px', async () => {
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext({ viewport: { width, height: 900 },
        permissions: ['clipboard-read', 'clipboard-write'] });
      await context.addInitScript(({ key, fixture }) => {
        window.__docsQaInspect = true;
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(fixture));
      }, { key, fixture });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url, { waitUntil: 'networkidle' });
      const editor = page.locator('.ProseMirror');
      await editor.waitFor({ state: 'visible' });
      const before = await read(page);
      assert.equal(before.content.filter(node => node.type === 'codeBlock').length, 1);
      assert.equal(await editor.getByLabel('Code language').count(), 1);

      const target = editor.locator(':scope > p').first();
      await target.selectText();
      const selection = await target.evaluate(element => {
        const native = window.getSelection(), pm = window.__docsQaSelection?.();
        return { nativeText: native?.toString(), pm,
          inside: !!native?.anchorNode && !!native?.focusNode &&
            element.contains(native.anchorNode) && element.contains(native.focusNode) };
      });
      assert.ok(selection.inside && selection.nativeText?.startsWith('Bold'));
      assert.equal(selection.pm?.fromParent, 'paragraph');
      assert.equal(selection.pm?.toParent, 'paragraph');
      assert.equal(selection.pm?.fromStart, selection.pm?.toStart);
      assert.equal(selection.pm?.fromOffset, 0);
      assert.equal(selection.pm?.toOffset, selection.pm?.fromParentSize);
      await page.getByRole('toolbar', { name: 'Selection formatting' }).waitFor({ state: 'visible' });
      await page.getByLabel('Selected text style').selectOption('h3');
      await page.keyboard.press('Escape');
      assert.equal(await editor.getByLabel('Code language').count(), 1,
        'Single-paragraph H3 conversion must preserve the following code block');
      assert.equal((await read(page)).content.filter(node => node.type === 'codeBlock').length, 1);

      const appearance = page.getByRole('button', { name: 'Callout appearance' });
      await appearance.first().click();
      const settings = page.getByRole('group', { name: 'Callout settings' });
      await settings.getByRole('button', { name: 'Callout background #fff3cf' }).click();
      await settings.waitFor({ state: 'visible' });
      await page.getByLabel('Callout text color').fill('#123456');
      await settings.waitFor({ state: 'visible' });
      await settings.getByRole('button', { name: 'Done' }).click();
      assert.equal(await editor.getByLabel('Code language').count(), 1);
      await editor.getByLabel('Code language').selectOption('javascript');
      assert.ok(await editor.locator('.code-token-keyword').count() > 0);
      await editor.getByRole('button', { name: 'Wrap code lines' }).click();
      assert.equal(await editor.locator('.document-code-block pre').getAttribute('data-wrap'), 'true');
      await editor.getByRole('button', { name: 'Copy code' }).click();
      await page.getByText('Copied', { exact: true }).waitFor({ state: 'visible' });

      await page.waitForFunction(key => {
        const doc = JSON.parse(localStorage.getItem(key) || 'null')?.doc;
        const code = doc?.content?.find(node => node.type === 'codeBlock');
        return doc?.content?.[0]?.type === 'heading' && code?.attrs?.language === 'javascript' &&
          code?.attrs?.wrap === true;
      }, key);
      const saved = await read(page);
      await page.reload({ waitUntil: 'networkidle' });
      assert.deepEqual(await read(page), saved, 'H3, Callout and Code changes survive reload');
      assert.equal(await editor.getByLabel('Code language').count(), 1);
      assert.deepEqual(errors, [], 'No browser runtime errors');
      await context.close();
    } finally { await browser.close(); }
  });
}
