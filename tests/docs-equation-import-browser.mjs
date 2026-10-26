import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';

const url = process.env.EDITOR_URL || 'http://127.0.0.1:4182/';
const key = 'docs-editor-lab-session-v4';
const latex = String.raw`\frac{active\_users}{eligible\_users}`;
const starting = { version: 2, title: 'Equation import QA', comments: [], savedAt: new Date(0).toISOString(),
  doc: { type: 'doc', content: [
    { type: 'paragraph', content: [{ type: 'text', text: `$$${latex}$$` }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Following paragraph stays editable.' }] },
  ] } };

for (const width of [1365, 390]) {
  test(`Delimited display math imports and persists at ${width}px`, async () => {
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(({ key, starting }) => localStorage.setItem(key, JSON.stringify(starting)), { key, starting });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url, { waitUntil: 'networkidle' });
      const editor = page.locator('.ProseMirror');
      const equation = editor.locator('[data-type="equation"]');
      await equation.waitFor({ state: 'visible' });
      assert.equal(await editor.locator(':scope > p').filter({ hasText: 'Following paragraph stays editable.' }).count(), 1);
      const fraction = equation.locator('math mfrac');
      await fraction.waitFor({ state: 'visible' });
      const parts = await fraction.locator(':scope > *').allTextContents();
      assert.match(parts[0], /active.*users/);
      assert.match(parts[1], /eligible.*users/);
      await page.waitForFunction(key => {
        const saved = JSON.parse(localStorage.getItem(key) || 'null');
        return saved?.doc?.content?.[0]?.type === 'equation';
      }, key);
      await page.reload({ waitUntil: 'networkidle' });
      await page.locator('.ProseMirror [data-type="equation"] math mfrac').waitFor({ state: 'visible' });
      assert.deepEqual(errors, []);
      await context.close();
    } finally { await browser.close(); }
  });
}
