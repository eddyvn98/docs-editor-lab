// Optional local suite. Requires a running dev server; does not start CI.
// EDITOR_URL=http://127.0.0.1:5173 node tests/ui-features-browser.mjs
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [1365, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.EDITOR_URL || 'http://127.0.0.1:5173');
    await page.getByRole('button', { name: 'Document templates', exact: true }).waitFor();
    const initial = await page.locator('.ProseMirror').innerText();
    await page.getByRole('button', { name: 'Document templates', exact: true }).click();
    const gallery = page.getByRole('dialog', { name: 'Template gallery' });
    await gallery.getByRole('button', { name: 'Insert Meeting notes', exact: true }).click();
    await page.locator('.ProseMirror h2').filter({ hasText: 'Meeting notes' }).waitFor();
    assert.ok((await page.locator('.ProseMirror').innerText()).includes(initial.slice(0, 20)));
    const toggle = page.locator('.toggle-block').last();
    const before = await toggle.locator('.toggle-body').textContent();
    await toggle.getByRole('button', { name: 'Collapse toggle', exact: true }).click();
    assert.equal(await toggle.locator('.toggle-body').isVisible(), false);
    assert.equal(await toggle.locator('.toggle-body').textContent(), before);
    await toggle.getByRole('button', { name: 'Expand toggle', exact: true }).click();
    await toggle.getByRole('textbox', { name: 'Toggle title' }).fill('Additional references');

    const image = page.locator('.ProseMirror .image-figure img').first();
    const original = await image.getAttribute('src');
    await image.dblclick();
    const viewer = page.getByRole('dialog', { name: 'Image viewer', exact: true });
    await viewer.getByRole('slider', { name: 'Image zoom' }).focus();
    await page.keyboard.press('ArrowRight');
    await viewer.getByRole('button', { name: 'Crop image', exact: true }).click();
    const crop = page.getByRole('dialog', { name: 'Image preview and crop' });
    await crop.getByRole('button', { name: 'Crop image', exact: true }).click();
    await crop.getByRole('button', { name: 'Square', exact: true }).click();
    await crop.getByRole('button', { name: 'Apply crop', exact: true }).click();
    await crop.waitFor({ state: 'hidden' });
    await viewer.getByRole('button', { name: 'Close Image viewer', exact: true }).click();
    assert.ok((await image.getAttribute('src')).startsWith('data:image/png'));
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    assert.equal(await image.getAttribute('src'), original);

    await page.getByRole('button', { name: 'Document templates', exact: true }).click();
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.deepEqual(errors, []);
    console.log(`PASS merged feature flows width=${width}`);
    await context.close();
  }
} finally { await browser.close(); }
