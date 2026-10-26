import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const url = process.env.EDITOR_URL || 'http://127.0.0.1:4182/';
const key = 'docs-editor-lab-session-v4';
const starting = { version: 2, title: 'Insert menu QA', comments: [], doc: { type: 'doc', content: [
  { type: 'paragraph' },
] } };
const browser = await chromium.launch();
try {
  for (const width of [1365, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    await context.addInitScript(({ key, starting }) => localStorage.setItem(key, JSON.stringify(starting)), { key, starting });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    const editor = page.locator('.ProseMirror');
    await editor.waitFor({ state: 'visible' });

    await page.getByRole('button', { name: 'Insert block' }).click();
    const palette = page.getByRole('dialog', { name: 'Insert a block' });
    const plusGrid = palette.locator('.docs-quick-insert');
    await plusGrid.waitFor({ state: 'visible' });
    assert.equal(await plusGrid.getByRole('option').count(), 18, 'plus menu shows a compact 18-item basic block grid');
    assert.match(await palette.innerText(), /Common blocks|Thường dùng/);
    assert.equal(await palette.getByRole('option', { name: 'Checklist' }).count(), 1, 'Checklist must not appear twice in one insert menu');
    assert.equal(await palette.getByRole('option', { name: 'Callout' }).count(), 1, 'Callout must not appear twice');
    assert.equal(await palette.getByRole('option', { name: 'Equation' }).count(), 1, 'Equation must not appear twice');
    assert.doesNotMatch(await palette.innerText(), /Sheets|Mermaid/);
    await palette.getByRole('combobox', { name: 'Search blocks' }).fill('table');
    await plusGrid.waitFor({ state: 'hidden' });
    assert.equal(await palette.getByRole('option').count(), 2, 'search presents concise matches without descriptions');
    assert.match(await palette.innerText(), /Table of Contents/);
    await page.keyboard.press('Escape');

    await editor.locator('> p').first().click();
    await page.keyboard.type('/');
    const slashMenu = page.locator('.docs-block-menu.is-insert');
    await slashMenu.locator('.docs-quick-insert').waitFor({ state: 'visible' });
    assert.equal(await slashMenu.locator('.docs-quick-insert [role="menuitem"]').count(), 18, 'slash menu shares the same quick block grid');
    assert.equal(await slashMenu.getByRole('menuitem', { name: 'Checklist', exact: true }).count(), 1, 'Slash Checklist is not duplicated');
    assert.equal(await slashMenu.getByRole('menuitem', { name: 'Callout', exact: true }).count(), 1, 'Slash Callout is not duplicated');
    assert.match(await slashMenu.innerText(), /Common blocks|Thường dùng/);
    assert.doesNotMatch(await slashMenu.innerText(), /Sheets|Mermaid/);
    await page.keyboard.press('Escape');
    await context.close();
    console.log(`PASS compact plus and slash menus at ${width}px`);
  }
} finally {
  await browser.close();
}
