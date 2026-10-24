import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';

const url = process.env.EDITOR_URL || 'http://127.0.0.1:4182/';
const key = 'docs-editor-lab-session-v4';
const starting = { version: 2, title: 'Outline navigation QA', comments: [], savedAt: new Date(0).toISOString(), doc: { type: 'doc', content: [
  { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Target section' }] },
  { type: 'paragraph', content: [{ type: 'text', text: 'Section content' }] },
] } };

for (const width of [1365, 390]) {
  test(`Outline navigation at ${width}px`, async () => {
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(({ key, starting }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(starting));
      }, { key, starting });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });
      const panel = page.locator('#docs-outline');
      if (width <= 1000) {
        await page.getByRole('button', { name: 'Toggle outline and comments' }).click();
        await panel.waitFor({ state: 'visible' });
      } else {
        await panel.waitFor({ state: 'visible' });
      }
      await panel.locator('button[title="Target section"]').click();
      assert.equal(await panel.isVisible(), width > 1000, 'Mobile closes navigation after choosing a heading; desktop keeps its outline');
      if (width <= 1000) {
        assert.equal(await page.getByRole('button', { name: 'Close document panels' }).count(), 0);
        assert.equal(await page.locator('.ProseMirror').evaluate(editor => document.activeElement === editor), true,
          'After mobile navigation the editor should regain keyboard focus');
      }
      await context.close();
    } finally { await browser.close(); }
  });
}
