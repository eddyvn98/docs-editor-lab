import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';

// All edits happen inside fresh browser storage, not the user's saved document.
const url = process.env.EDITOR_URL || 'http://127.0.0.1:4182/';
const key = 'docs-editor-lab-session-v4';
const p = value => ({ type: 'paragraph', content: [{ type: 'text', text: value }] });
const cell = (value, header = false) => ({
  type: header ? 'tableHeader' : 'tableCell', content: [p(value)],
});
const seed = {
  version: 2, title: 'Rich blocks QA', savedAt: new Date(0).toISOString(), comments: [],
  doc: { type: 'doc', content: [
    p('Rich blocks QA anchor'),
    { type: 'table', content: [
      { type: 'tableRow', content: [cell('Feature', true), cell('Status', true)] },
      { type: 'tableRow', content: [cell('Initial row'), cell('Pending')] },
    ] },
    { type: 'image', attrs: {
      src: '/editor-sample.svg', alt: 'QA illustration', width: '80%', caption: 'Original caption',
    } },
    { type: 'mediaBlock', attrs: {
      kind: 'web', src: 'https://example.com/original',
      label: 'Old web card', description: 'Old card description',
    } },
    { type: 'mediaBlock', attrs: { kind: 'file', src: '', assetId: '', label: '' } },
    { type: 'paragraph' },
  ] },
};
const bytes = Buffer.from('Docs QA local attachment: round-trip through IndexedDB', 'utf8');
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), key);
function nodes(node, out = []) {
  if (node) { out.push(node); for (const child of node.content || []) nodes(child, out); }
  return out;
}
const find = (doc, type, filter = () => true) => nodes(doc).find(n => n.type === type && filter(n));

for (const width of [1365, 390]) {
  test('Rich blocks persist at ' + width + 'px', async () => {
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(({ key, seed }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(seed));
      }, { key, seed });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url, { waitUntil: 'networkidle' });
      const editor = page.locator('.ProseMirror');
      await editor.waitFor({ state: 'visible' });

      // Real cell interaction; the existing table starts at exactly 2x2.
      const table = editor.locator('table').first();
      assert.equal(await table.locator('tr').count(), 2);
      await table.locator('tr').nth(1).locator('td').first().click();
      const toolbar = page.getByRole('toolbar', { name: 'Table formatting' });
      await toolbar.waitFor({ state: 'visible' });
      await toolbar.getByRole('button', { name: '+ Row', exact: true }).click();
      assert.equal(await table.locator('tr').count(), 3, 'Add Row changes table structure');
      await table.locator('tr').nth(2).locator('td').first().locator('p').click();
      await page.keyboard.type('Created row');
      assert.equal((await table.locator('tr').nth(2).locator('td').first().innerText()).trim(), 'Created row');
      await toolbar.getByRole('button', { name: '+ Column', exact: true }).click();
      assert.equal(await table.locator('tr').first().locator('th,td').count(), 3,
        'Add Column extends every row');

      // Image keyboard resize and caption update must both reach doc JSON.
      const image = editor.locator('.image-figure').first();
      const resize = image.getByRole('button', { name: 'Resize image' });
      await resize.scrollIntoViewIfNeeded();
      await resize.focus();
      await page.keyboard.press('ArrowLeft');
      await image.getByRole('textbox', { name: 'Image caption' }).fill('Revised image caption');

      // Web card edits test the media node's source, title and description.
      const web = editor.locator('[data-type="mediaBlock"]').first();
      await web.getByRole('button', { name: 'Edit media' }).click();
      await web.getByRole('textbox', { name: 'Media title' }).fill('QA documentation link');
      await web.getByRole('textbox', { name: 'Media URL' }).fill('https://example.com/docs-qa');
      await web.getByRole('textbox', { name: 'Web card description' }).fill('Updated in the editor');
      await web.getByRole('button', { name: 'Save' }).click();
      const link = web.getByRole('link', { name: 'Open link' });
      await link.waitFor({ state: 'visible' });
      assert.equal(await link.getAttribute('href'), 'https://example.com/docs-qa');

      // Local upload exercises IndexedDB, not merely an external file URL.
      const file = editor.locator('[data-type="mediaBlock"]').last();
      await file.locator('input[type="file"]').setInputFiles({
        name: 'rich-block-qa.txt', mimeType: 'text/plain', buffer: bytes,
      });
      await file.getByRole('link', { name: 'Download attachment' }).waitFor({ state: 'visible' });
      await page.waitForFunction(key => {
        const doc = JSON.parse(localStorage.getItem(key) || 'null')?.doc;
        const flatten = (node, out = []) => {
          if (node) { out.push(node); (node.content || []).forEach(n => flatten(n, out)); }
          return out;
        };
        const all = flatten(doc), table = all.find(n => n.type === 'table');
        const rows = table?.content || [];
        const image = all.find(n => n.type === 'image');
        const web = all.find(n => n.type === 'mediaBlock' && n.attrs?.kind === 'web');
        const file = all.find(n => n.type === 'mediaBlock' && n.attrs?.kind === 'file');
        return rows.length === 3 && rows.every(row => row.content?.length === 3) &&
          JSON.stringify(rows[2]).includes('Created row') &&
          image?.attrs?.width === '75%' && image?.attrs?.caption === 'Revised image caption' &&
          web?.attrs?.src === 'https://example.com/docs-qa' &&
          web?.attrs?.label === 'QA documentation link' &&
          web?.attrs?.description === 'Updated in the editor' &&
          file?.attrs?.label === 'rich-block-qa.txt' &&
          typeof file?.attrs?.assetId === 'string' && file.attrs.assetId.length > 0 &&
          file.attrs.size === 54;
      }, key, { timeout: 12000 });

      const before = await saved(page);
      assert.equal(find(before.doc, 'table').content.length, 3);
      assert.equal(find(before.doc, 'image').attrs.width, '75%');
      assert.ok(find(before.doc, 'mediaBlock', n => n.attrs?.kind === 'file').attrs.assetId);
      await page.reload({ waitUntil: 'networkidle' });
      const after = await saved(page);
      assert.deepEqual(after.doc, before.doc, 'All block attributes survive reload');

      // Uploaded attachment bytes are still retrievable after object-URL recreation.
      const attachment = editor.locator('[data-type="mediaBlock"]').last();
      const download = attachment.getByRole('link', { name: 'Download attachment' });
      await download.waitFor({ state: 'visible' });
      const recovered = await download.evaluate(async link => {
        const response = await fetch(link.href);
        return [...new Uint8Array(await response.arrayBuffer())];
      });
      assert.deepEqual(Buffer.from(recovered), bytes, 'IndexedDB retains the original file bytes');
      assert.equal(await editor.locator('.image-figure').first()
        .getByRole('textbox', { name: 'Image caption' }).inputValue(), 'Revised image caption');
      assert.deepEqual(errors, [], 'No runtime page errors');
      await context.close();
    } finally { await browser.close(); }
  });
}
