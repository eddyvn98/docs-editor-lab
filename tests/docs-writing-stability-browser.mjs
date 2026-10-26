import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';

const url = process.env.EDITOR_URL || 'http://127.0.0.1:4182/';
const key = 'docs-editor-lab-session-v4';
const paragraph = text => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const fixture = { version: 2, title: 'Block range QA', comments: [], savedAt: new Date(0).toISOString(),
  doc: { type: 'doc', content: ['A', 'B', 'C', 'D'].map(value => paragraph(`RANGE ${value}`)) } };
const order = ['RANGE A', 'RANGE D', 'RANGE B', 'RANGE C'];
const currentOrder = page => page.locator('.ProseMirror > p').allTextContents();

for (const width of [1365, 390]) {
  test(`Multi-block drag, move, Undo/Redo and reload at ${width}px`, async () => {
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(({ key, fixture }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(fixture));
      }, { key, fixture });
      const page = await context.newPage(), errors = [], mod = process.platform === 'darwin' ? 'Meta' : 'Control';
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url, { waitUntil: 'networkidle' });
      const editor = page.locator('.ProseMirror'), blocks = editor.locator(':scope > p');
      await editor.waitFor({ state: 'visible' });
      const second = await blocks.nth(1).boundingBox(), third = await blocks.nth(2).boundingBox(), bounds = await editor.boundingBox();
      assert.ok(second && third && bounds);
      const railX = Math.max(1, bounds.x - 12);
      await page.mouse.move(railX, second.y + second.height / 2);
      await page.mouse.down();
      await page.mouse.move(railX, third.y + third.height / 2, { steps: 12 });
      await page.mouse.up();
      assert.equal(await page.locator('.docs-block-selected').count(), 2, 'Dragging the left rail selects both blocks');
      await page.keyboard.press('Alt+ArrowDown');
      assert.deepEqual(await currentOrder(page), order, 'Move down reorders the selected range as a unit');
      await page.keyboard.press(`${mod}+z`);
      assert.deepEqual(await currentOrder(page), fixture.doc.content.map(node => node.content[0].text), 'Undo restores the original order');
      await page.keyboard.press(`${mod}+Shift+z`);
      assert.deepEqual(await currentOrder(page), order, 'Redo reapplies the range move');
      await page.waitForFunction(({ key, order }) => {
        const saved = JSON.parse(localStorage.getItem(key) || 'null');
        return saved?.doc?.content?.map(node => node.content?.[0]?.text).join('|') === order.join('|');
      }, { key, order });
      const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
      await page.reload({ waitUntil: 'networkidle' });
      assert.deepEqual(await currentOrder(page), order, 'The moved blocks survive reload');
      const afterReload = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
      assert.deepEqual(afterReload.doc, saved.doc, 'Reload preserves the serialized moved document');
      assert.deepEqual(afterReload.comments, saved.comments);
      assert.equal(afterReload.title, saved.title);
      assert.deepEqual(errors, []);
      await context.close();
    } finally { await browser.close(); }
  });

  test(`Enter and Delete keep a deep paragraph in view at ${width}px`, async () => {
    const longContent = [
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Deep writing QA' }] },
      ...Array.from({ length: 18 }, (_, index) => paragraph(`Filler ${index + 1} for a long document.`)),
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '6. Kế hoạch thực thi' }] },
      paragraph('Phân kì: giai đoạn đầu chuẩn bị.'), paragraph('Nội dung kế tiếp cần giữ nguyên.'),
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '7. Theo dõi' }] },
    ];
    const longFixture = { version: 2, title: 'Deep caret QA', comments: [], savedAt: new Date(0).toISOString(),
      doc: { type: 'doc', content: longContent } };
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext({ viewport: { width, height: 860 } });
      await context.addInitScript(({ key, fixture }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(fixture));
      }, { key, fixture: longFixture });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url, { waitUntil: 'networkidle' });
      const editor = page.locator('.ProseMirror');
      const target = editor.locator(':scope > p').filter({ hasText: 'Phân kì: giai đoạn đầu chuẩn bị.' });
      await target.scrollIntoViewIfNeeded();
      const point = await target.evaluate(element => {
        const range = document.createRange(), text = element.firstChild;
        range.setStart(text, text.textContent.length); range.collapse(true);
        const rect = range.getBoundingClientRect(); return { x: rect.left, y: rect.top + rect.height / 2 };
      });
      await page.mouse.click(point.x, point.y);
      const beforeEnter = await page.evaluate(() => window.scrollY);
      await page.keyboard.press('Enter');
      const index = await editor.locator(':scope > p').evaluateAll(nodes =>
        nodes.findIndex(node => node.textContent?.includes('Phân kì:')));
      assert.ok(index >= 0);
      assert.equal(await editor.locator(':scope > p').nth(index + 1).evaluate(element => element.textContent), '');
      const afterEnter = await page.evaluate(() => window.scrollY);
      await page.keyboard.press('Delete');
      assert.equal(await editor.locator(':scope > p').nth(index + 1).innerText(), 'Nội dung kế tiếp cần giữ nguyên.');
      const afterDelete = await page.evaluate(() => window.scrollY);
      assert.ok(Math.abs(afterEnter - beforeEnter) < 48, `Enter scroll delta was ${afterEnter - beforeEnter}px`);
      assert.ok(Math.abs(afterDelete - afterEnter) < 48, `Delete scroll delta was ${afterDelete - afterEnter}px`);
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) || 'null')?.doc?.content
        ?.some(node => node.content?.[0]?.text === 'Nội dung kế tiếp cần giữ nguyên.'), key);
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await editor.locator(':scope > p').nth(index + 1).innerText(), 'Nội dung kế tiếp cần giữ nguyên.');
      assert.deepEqual(errors, []);
      await context.close();
    } finally { await browser.close(); }
  });
}
