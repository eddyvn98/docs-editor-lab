import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';

const url = process.env.EDITOR_URL || 'http://127.0.0.1:4183/';
const key = 'docs-editor-lab-session-v4';
const phrase = 'plain bold tail';
const fixture = { version: 2, title: 'Clipboard/caret QA', comments: [],
  doc: { type: 'doc', content: [
    { type: 'paragraph', content: [
      { type: 'text', text: 'plain ' },
      { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
      { type: 'text', text: ' tail' },
    ] },
    { type: 'paragraph' },
  ] } };
const read = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null')?.doc, key);
const pasted = doc => doc?.content?.[1]?.content?.map(node => node.text || '').join('') === phrase;
const hasBold = doc => doc?.content?.[1]?.content?.some(node =>
  node.text === 'bold' && node.marks?.some(mark => mark.type === 'bold'));

for (const width of [1365, 390]) {
  test('Drag, click-collapse, rich paste, Undo/Redo and reload at ' + width + 'px', async () => {
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        permissions: ['clipboard-read', 'clipboard-write'],
      });
      await context.addInitScript(({ key, fixture }) => {
        window.__docsQaInspect = true;
        localStorage.setItem(key, JSON.stringify(fixture));
      }, { key, fixture });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url, { waitUntil: 'networkidle' });
      const editor = page.locator('.ProseMirror');
      await editor.waitFor({ state: 'visible' });
      const first = editor.locator(':scope > p').first();
      const second = editor.locator(':scope > p').nth(1);
      await first.scrollIntoViewIfNeeded();

      // Real mouse drag, not a programmatic DOM selection.
      const points = await first.evaluate(element => {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const nodes = [];
        for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node);
        const caret = (node, offset) => {
          const range = document.createRange();
          range.setStart(node, offset);
          range.collapse(true);
          const rect = range.getBoundingClientRect();
          return { x: rect.left, y: rect.top + rect.height / 2 };
        };
        return { start: caret(nodes[0], 0),
          end: caret(nodes[nodes.length - 1], nodes[nodes.length - 1].textContent.length) };
      });
      await page.mouse.move(points.start.x - 2, points.start.y);
      await page.mouse.down();
      await page.mouse.move(points.end.x + 3, points.end.y, { steps: 16 });
      await page.mouse.up();
      // Let the pointerup reconciliation finish before checking that a genuine
      // extended drag selection has not been collapsed.
      await page.evaluate(() => new Promise(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const selected = await page.evaluate(() => ({
        native: window.getSelection()?.toString(),
        collapsed: window.getSelection()?.isCollapsed,
        pm: window.__docsQaSelection?.(),
      }));
      assert.equal(selected.native, phrase, 'Mouse drag selects exactly one paragraph');
      assert.equal(selected.collapsed, false, 'Drag selection must stay expanded after pointerup');
      assert.ok(selected.pm && selected.pm.to > selected.pm.from,
        'ProseMirror retains the expanded selection after drag');
      await page.getByRole('toolbar', { name: 'Selection formatting' }).waitFor({ state: 'visible' });

      // Copy the rich text while it is selected, then move the caret by clicking.
      await page.keyboard.press('ControlOrMeta+C');
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), phrase);
      await second.click({ position: { x: 12, y: 10 } });
      // Wait for the click's selection reconciliation without arbitrary timeouts.
      await page.evaluate(() => new Promise(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const click = await second.evaluate(element => {
        const native = window.getSelection(), pm = window.__docsQaSelection?.();
        return { nativeCollapsed: native?.isCollapsed,
          nativeInTarget: !!native?.anchorNode && element.contains(native.anchorNode),
          pm };
      });
      assert.equal(click.nativeCollapsed, true, 'Click collapses native selection');
      assert.equal(click.nativeInTarget, true, 'Browser caret is inside destination paragraph');
      assert.ok(click.pm, 'QA PM inspector must be enabled');
      assert.equal(click.pm.from, click.pm.to, 'PM selection also collapses after click');
      assert.equal(click.pm.fromParent, 'paragraph');
      assert.equal(click.pm.fromStart, phrase.length + 3,
        'PM caret must be inside the second paragraph, not the prior selection');
      assert.equal(click.pm.fromOffset, 0, 'Caret starts at offset zero of empty paragraph');

      await page.keyboard.press('ControlOrMeta+V');
      await page.waitForFunction(() =>
        document.querySelectorAll('.ProseMirror > p')[1]?.textContent === 'plain bold tail');
      assert.equal(await second.innerText(), phrase);
      assert.ok(hasBold((await read(page))), 'Pasted text retains its bold mark');
      assert.equal((await read(page)).content[0].content.map(n => n.text).join(''), phrase,
        'Original source paragraph is unchanged');

      await page.keyboard.press('ControlOrMeta+Z');
      await page.waitForFunction(() => document.querySelectorAll('.ProseMirror > p')[1]?.textContent === '');
      assert.equal((await read(page)).content[1].type, 'paragraph');
      await page.keyboard.press('ControlOrMeta+Shift+Z');
      await page.waitForFunction(() =>
        document.querySelectorAll('.ProseMirror > p')[1]?.textContent === 'plain bold tail');
      assert.ok(hasBold(await read(page)), 'Redo preserves inline marks');

      await page.waitForFunction(key => {
        const doc = JSON.parse(localStorage.getItem(key) || 'null')?.doc;
        return doc?.content?.[1]?.content?.some(n =>
          n.text === 'bold' && n.marks?.some(mark => mark.type === 'bold'));
      }, key);
      const saved = await read(page);
      assert.ok(pasted(saved) && hasBold(saved));
      await page.reload({ waitUntil: 'networkidle' });
      assert.deepEqual(await read(page), saved, 'Rich paste survives autosave and reload');
      assert.ok(hasBold(await read(page)));
      assert.deepEqual(errors, [], 'No runtime browser errors');
      await context.close();
    } finally { await browser.close(); }
  });
}
