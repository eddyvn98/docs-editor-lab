import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';

const url = process.env.EDITOR_URL || 'http://127.0.0.1:4182/';
const key = 'docs-editor-lab-session-v4';
const p = text => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const starting = { version: 2, title: 'Docs UX milestone QA', comments: [], savedAt: new Date(0).toISOString(), doc: { type: 'doc', content: [
  p('Table insertion anchor'),
  { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Parent section' }] },
  p('Parent body'),
  { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Child section' }] },
  p('Needle in collapsed child'),
  { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Other section' }] },
  p('Other collapsed body'),
] } };

for (const width of [1365, 390]) {
  test(`Docs keyboard search and table insertion at ${width}px`, async () => {
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(({ key, starting }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(starting));
      }, { key, starting });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });
      const editor = page.locator('.ProseMirror'), mod = process.platform === 'darwin' ? 'Meta' : 'Control';
      await editor.waitFor({ state: 'visible' });
      if (width <= 1000) {
        await page.getByRole('button', { name: 'Toggle outline and comments' }).click();
        await page.locator('#docs-outline').waitFor({ state: 'visible' });
      }
      await page.getByRole('button', { name: 'Collapse all' }).click();
      const collapsedBeforeSearch = await page.evaluate(() => localStorage.getItem('docs-editor-lab-folding-v1'));
      if (width <= 1000) await page.getByRole('button', { name: 'Close outline' }).click();
      await editor.locator('> h1').first().click();
      await page.keyboard.press(`${mod}+f`);
      const find = page.getByRole('textbox', { name: 'Find text' });
      await find.waitFor({ state: 'visible' });
      assert.equal(await page.evaluate(() => localStorage.getItem('docs-editor-lab-folding-v1')), collapsedBeforeSearch,
        'Opening Find must preserve the saved collapsed-heading state');
      await find.fill('Needle in collapsed child');
      await find.press('Enter');
      await page.waitForFunction(() => {
        const target = [...document.querySelectorAll('.ProseMirror p')].find(node => node.textContent?.includes('Needle in collapsed child'));
        return target && !target.classList.contains('fold-hidden');
      });
      assert.equal(await editor.locator('p').filter({ hasText: 'Other collapsed body' }).evaluate(node => node.classList.contains('fold-hidden')), true,
        'Finding text should reveal only the matching collapsed section');

      await find.press('Escape');
      await editor.locator('> p').first().click();
      await page.keyboard.press('End');
      await page.getByRole('button', { name: 'Insert block' }).click();
      const dialog = page.getByRole('dialog', { name: 'Insert a block' });
      await dialog.getByRole('option', { name: /^Table Editable table/ }).click();
      const grid = page.getByRole('grid', { name: 'Choose table size' });
      const firstCell = grid.getByRole('gridcell', { name: '3 columns, 3 rows' });
      await firstCell.focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      const table = editor.locator('table').last();
      await table.waitFor({ state: 'visible' });
      assert.equal(await table.locator('tr').count(), 4, 'Arrow keys select four rows before Enter inserts the table');
      assert.equal(await table.locator('tr').first().locator('th,td').count(), 4, 'Arrow keys select four columns before Enter inserts the table');
      assert.equal(await editor.evaluate(node => document.activeElement === node), true, 'The editor should regain focus after keyboard insertion');
      await page.keyboard.type('Keyboard cell entry');
      assert.match(await table.innerText(), /Keyboard cell entry/, 'The restored caret should accept keyboard input in the inserted table');
      await context.close();
    } finally { await browser.close(); }
  });
}
