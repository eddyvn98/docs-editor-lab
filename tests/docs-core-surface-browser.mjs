import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';

const url = process.env.EDITOR_URL || 'http://127.0.0.1:4183/';
const key = 'docs-editor-lab-session-v4';
const text = value => ({ type: 'text', text: value });
const paragraph = value => ({ type: 'paragraph', content: [text(value)] });
const fixture = { version: 2, title: 'Docs core surface QA', comments: [],
  doc: { type: 'doc', content: [
    { type: 'paragraph', content: [
      { type: 'text', text: 'Bold', marks: [{ type: 'bold' }] },
      text(', italic, underline, strike, inline code, link, highlight, and comments.'),
    ] },
    paragraph('Second paragraph stays separate when selection crosses blocks.'),
    { type: 'callout', content: [paragraph('Callout color control')] },
    { type: 'codeBlock', attrs: { language: 'typescript' },
      content: [text('const retained = true;')] },
    { type: 'paragraph' },
  ] } };
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null')?.doc, key);
const assertFullSelection = async page => {
  const state = await page.evaluate(() => ({ text: window.getSelection()?.toString(), pm: window.__docsQaSelection?.() }));
  assert.equal(state.text, 'Bold, italic, underline, strike, inline code, link, highlight, and comments.',
    `Block conversion restores the complete selected range: ${JSON.stringify(state.pm)}`);
  assert.equal(state.pm?.fromOffset, 0, 'The converted text range starts at the paragraph start');
  assert.equal(state.pm?.toOffset, state.pm?.fromParentSize, 'The converted text range ends at the paragraph end');
};

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
      const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
      const undo = async () => width > 1200 ? page.getByRole('button', { name: 'Undo' }).click() : page.keyboard.press(`${mod}+z`);
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url, { waitUntil: 'networkidle' });
      const editor = page.locator('.ProseMirror');
      await editor.waitFor({ state: 'visible' });
      const before = await read(page);
      assert.equal(before.content.filter(node => node.type === 'codeBlock').length, 1);
      assert.equal(await editor.getByLabel('Code language').count(), 1);

      const target = editor.locator(':scope > p').first();
      await target.click();
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
      const typeTrigger = page.getByRole('button', { name: 'Block type' });
      await typeTrigger.click();
      const conversionMenu = page.getByRole('menu', { name: 'Text style and blocks' });
      await conversionMenu.waitFor({ state: 'visible' });
      for (const name of ['Text', ...Array.from({ length: 9 }, (_, index) => `Heading ${index + 1}`),
        'Bullet list', 'Numbered list', 'Checklist', 'Code block', 'Quote', 'Callout']) {
        const item = conversionMenu.getByRole('menuitemradio', { name, exact: true });
        assert.equal(await item.count(), 1, `Text menu includes ${name}`);
        assert.equal(await item.isDisabled(), false, `Text menu enables ${name} for a single paragraph`);
      }
      const lastConversion = conversionMenu.getByRole('menuitemradio', { name: 'Callout', exact: true });
      await lastConversion.scrollIntoViewIfNeeded();
      assert.equal(await lastConversion.isVisible(), true, 'The final conversion remains reachable by scrolling');
      await conversionMenu.evaluate(panel => { panel.scrollTop = 0; });
      const menuBox = await conversionMenu.boundingBox();
      assert.ok(menuBox && menuBox.x >= 0 && menuBox.y >= 0 && menuBox.x + menuBox.width <= width && menuBox.y + menuBox.height <= 900,
        'Conversion menu stays inside desktop and mobile viewports');
      const unchanged = await read(page);
      await page.keyboard.press('Escape');
      await conversionMenu.waitFor({ state: 'hidden' });
      assert.deepEqual(await read(page), unchanged, 'Escape closes the menu without changing document content');

      await typeTrigger.click();
      await conversionMenu.waitFor({ state: 'visible' });
      await conversionMenu.getByRole('menuitemradio', { name: 'Heading 3', exact: true }).click();
      await editor.locator(':scope > h3').filter({ hasText: 'Bold, italic' }).waitFor({ state: 'visible' });
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) || 'null')?.doc?.content?.[0]?.type === 'heading', key);
      const heading = (await read(page)).content[0];
      assert.equal(heading.attrs.level, 3);
      assert.equal(heading.content.map(node => node.text || '').join(''), 'Bold, italic, underline, strike, inline code, link, highlight, and comments.', 'Text survives block conversion');
      assert.ok(heading.content.find(node => node.text === 'Bold')?.marks?.some(mark => mark.type === 'bold'), 'Inline marks survive block conversion');
      assert.equal(await page.evaluate(() => window.getSelection()?.toString()), 'Bold, italic, underline, strike, inline code, link, highlight, and comments.',
        'The selected text range is restored inside the converted heading');
      await undo();
      await editor.locator(':scope > p').filter({ hasText: 'Bold, italic' }).waitFor({ state: 'visible' });
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) || 'null')?.doc?.content?.[0]?.type === 'paragraph', key);
      assert.equal((await read(page)).content[0].type, 'paragraph', 'Undo restores the original block type');
      await target.click();
      await target.click();
      await target.selectText();
      await page.getByRole('toolbar', { name: 'Selection formatting' }).waitFor({ state: 'visible' });
      await typeTrigger.click();
      await conversionMenu.getByRole('menuitemradio', { name: 'Bullet list', exact: true }).click();
      await editor.locator(':scope > ul > li p').filter({ hasText: 'Bold, italic' }).waitFor({ state: 'visible' });
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) || 'null')?.doc?.content?.[0]?.type === 'bulletList', key);
      assert.equal((await read(page)).content[0].type, 'bulletList', 'Bullet conversion uses the saved selection');
      await assertFullSelection(page);
      await undo();
      await editor.locator(':scope > p').filter({ hasText: 'Bold, italic' }).waitFor({ state: 'visible' });
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) || 'null')?.doc?.content?.[0]?.type === 'paragraph', key);
      for (const [label, type] of [['Numbered list', 'orderedList'], ['Checklist', 'taskList'], ['Callout', 'callout']]) {
        await target.click();
        await target.selectText();
        assert.equal(await page.evaluate(() => window.getSelection()?.toString()), 'Bold, italic, underline, strike, inline code, link, highlight, and comments.');
        await page.getByRole('toolbar', { name: 'Selection formatting' }).waitFor({ state: 'visible' });
        await typeTrigger.click();
        await conversionMenu.getByRole('menuitemradio', { name: label, exact: true }).click();
        await page.waitForFunction(({ key, type }) => JSON.parse(localStorage.getItem(key) || 'null')?.doc?.content?.[0]?.type === type, { key, type });
        assert.equal((await read(page)).content[0].type, type, `${label} conversion uses the saved selection`);
        await assertFullSelection(page);
        await undo();
        await editor.locator(':scope > p').filter({ hasText: 'Bold, italic' }).waitFor({ state: 'visible' });
        await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) || 'null')?.doc?.content?.[0]?.type === 'paragraph', key);
      }
      await target.click();
      await target.selectText();
      assert.equal(await page.evaluate(() => window.getSelection()?.toString()), 'Bold, italic, underline, strike, inline code, link, highlight, and comments.');
      await page.getByRole('toolbar', { name: 'Selection formatting' }).waitFor({ state: 'visible' });
      const beforeQuote = await page.evaluate(() => window.__docsQaSelection?.());
      assert.equal(beforeQuote?.toOffset, beforeQuote?.fromParentSize, 'The source selection covers the final character');
      await typeTrigger.click();
      await conversionMenu.getByRole('menuitemradio', { name: 'Quote', exact: true }).click();
      await editor.locator('blockquote > p').filter({ hasText: 'Bold, italic' }).waitFor({ state: 'visible' });
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) || 'null')?.doc?.content?.[0]?.type === 'blockquote', key);
      assert.equal((await read(page)).content[0].type, 'blockquote', 'Quote conversion uses the saved selection');
      await assertFullSelection(page);
      await undo();
      await editor.locator(':scope > p').filter({ hasText: 'Bold, italic' }).waitFor({ state: 'visible' });
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) || 'null')?.doc?.content?.[0]?.type === 'paragraph', key);
      await target.click();
      await target.selectText();
      assert.equal(await page.evaluate(() => window.getSelection()?.toString()), 'Bold, italic, underline, strike, inline code, link, highlight, and comments.');
      await page.getByRole('toolbar', { name: 'Selection formatting' }).waitFor({ state: 'visible' });
      await typeTrigger.click();
      await conversionMenu.waitFor({ state: 'visible' });
      const beforeOutsideClick = await read(page);
      await page.mouse.click(4, 4);
      await conversionMenu.waitFor({ state: 'hidden' });
      assert.deepEqual(await read(page), beforeOutsideClick, 'Outside click closes the menu without converting text');
      await editor.evaluate(root => {
        const paragraphs = root.querySelectorAll(':scope > p');
        const start = paragraphs[0].firstChild, end = paragraphs[1].firstChild;
        const selection = window.getSelection();
        if (start && end && selection) selection.setBaseAndExtent(start, 0, end, end.textContent?.length || 0);
      });
      await page.waitForFunction(() => window.getSelection()?.toString().includes('Second paragraph stays separate'));
      await page.getByRole('toolbar', { name: 'Selection formatting' }).waitFor({ state: 'visible' });
      await typeTrigger.click();
      await conversionMenu.waitFor({ state: 'visible' });
      assert.equal(await conversionMenu.getByRole('menuitemradio').first().isDisabled(), true,
        'Block conversion is disabled for a selection spanning multiple paragraphs');
      await page.keyboard.press('Escape');
      await target.click();
      await target.selectText();
      await page.getByRole('toolbar', { name: 'Selection formatting' }).waitFor({ state: 'visible' });
      await typeTrigger.click();
      await conversionMenu.getByRole('menuitemradio', { name: 'Heading 3', exact: true }).click();
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) || 'null')?.doc?.content?.[0]?.type === 'heading', key);
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
