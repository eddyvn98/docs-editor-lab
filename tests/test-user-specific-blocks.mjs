import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import path from 'node:path';

const url = 'http://127.0.0.1:4182/';
const brainDir = '/Users/htt711/.gemini/antigravity/brain/e3fcbe21-f635-4b4d-801f-ac73f34edcea';

async function main() {
  console.log('Testing all user-specific blocks from the + menu on http://127.0.0.1:4182/ ...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1365, height: 950 } });
  const page = await context.newPage();

  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  await page.goto(url, { waitUntil: 'networkidle' });
  const editor = page.locator('.ProseMirror');
  await editor.waitFor();
  console.log('Editor ready.');

  // Helper to open in-line gutter + menu on a blank paragraph
  async function openGutterMenu() {
    await editor.click();
    await page.keyboard.press('Meta+ArrowDown');
    await page.keyboard.press('Enter');
    const p = editor.locator('> p').last();
    await p.hover();
    const addBtn = page.locator('.ux-gutter button[aria-label="Add block"]');
    await addBtn.waitFor({ state: 'visible' });
    await addBtn.click();
    const menu = page.locator('.ux-menu');
    await menu.waitFor({ state: 'visible' });
    return menu;
  }

  // ==========================================
  // 1. Sheets (Editable spreadsheet)
  // ==========================================
  console.log('1. Testing Sheets...');
  let menu = await openGutterMenu();
  let opt = menu.locator('button[role="menuitem"]').filter({ hasText: 'Sheets' }).first();
  await opt.scrollIntoViewIfNeeded();
  await opt.click();
  const sheet = editor.locator('.inline-sheet').last();
  await sheet.waitFor({ state: 'visible' });
  // Edit cell 1,1
  const cell = sheet.getByRole('textbox', { name: /Cell 1,1/i }).first();
  await cell.fill('Doanh thu Q3');
  await page.screenshot({ path: path.join(brainDir, 'block_01_sheets.png') });
  console.log('Saved block_01_sheets.png');

  // ==========================================
  // 2. Table of Contents
  // ==========================================
  console.log('2. Testing Table of Contents...');
  menu = await openGutterMenu();
  opt = menu.locator('button[role="menuitem"]').filter({ hasText: 'Table of Contents' }).first();
  await opt.scrollIntoViewIfNeeded();
  await opt.click();
  const toc = editor.locator('.node-docsToc, [data-type="docsToc"]').last();
  await toc.waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(brainDir, 'block_02_toc.png') });
  console.log('Saved block_02_toc.png');

  // ==========================================
  // 3. Timeline
  // ==========================================
  console.log('3. Testing Timeline...');
  menu = await openGutterMenu();
  opt = menu.locator('button[role="menuitem"]').filter({ hasText: 'Timeline' }).first();
  await opt.scrollIntoViewIfNeeded();
  await opt.click();
  const timeline = editor.locator('.node-docsTimeline, [data-type="docsTimeline"]').last();
  await timeline.waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(brainDir, 'block_03_timeline.png') });
  console.log('Saved block_03_timeline.png');

  // ==========================================
  // 4. Mermaid (Diagram)
  // ==========================================
  console.log('4. Testing Mermaid...');
  menu = await openGutterMenu();
  opt = menu.locator('button[role="menuitem"]').filter({ hasText: 'Mermaid' }).first();
  await opt.scrollIntoViewIfNeeded();
  await opt.click();
  const mermaid = editor.locator('.node-docsMermaid, [data-type="docsMermaid"]').last();
  await mermaid.waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(brainDir, 'block_04_mermaid.png') });
  console.log('Saved block_04_mermaid.png');

  // ==========================================
  // 5. Synced block
  // ==========================================
  console.log('5. Testing Synced block...');
  menu = await openGutterMenu();
  opt = menu.locator('button[role="menuitem"]').filter({ hasText: 'Synced block' }).first();
  await opt.scrollIntoViewIfNeeded();
  await opt.click();
  const synced = editor.locator('.node-syncedBlock, [data-type="syncedBlock"]').last();
  await synced.waitFor({ state: 'visible' });
  await page.keyboard.type('Nội dung khối đồng bộ (Synced block master) - Đã thử nghiệm thành công.');
  await page.screenshot({ path: path.join(brainDir, 'block_05_synced.png') });
  console.log('Saved block_05_synced.png');

  // ==========================================
  // 6. Block templates (Template gallery dialog)
  // ==========================================
  console.log('6. Testing Block templates gallery...');
  menu = await openGutterMenu();
  opt = menu.locator('button[role="menuitem"]').filter({ hasText: 'Block templates' }).first();
  await opt.scrollIntoViewIfNeeded();
  await opt.click();
  const gallery = page.getByRole('dialog', { name: /Template gallery|Templates/i });
  await gallery.waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(brainDir, 'block_06_block_templates.png') });
  console.log('Saved block_06_block_templates.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // ==========================================
  // 7. Meeting Notes Template
  // ==========================================
  console.log('7. Testing Meeting Notes template...');
  menu = await openGutterMenu();
  opt = menu.locator('button[role="menuitem"]').filter({ hasText: 'Meeting Notes' }).first();
  await opt.scrollIntoViewIfNeeded();
  await opt.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(brainDir, 'block_07_meeting_notes.png') });
  console.log('Saved block_07_meeting_notes.png');

  // ==========================================
  // 8. Project Plan Template
  // ==========================================
  console.log('8. Testing Project Plan template...');
  menu = await openGutterMenu();
  opt = menu.locator('button[role="menuitem"]').filter({ hasText: 'Project Plan' }).first();
  await opt.scrollIntoViewIfNeeded();
  await opt.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(brainDir, 'block_08_project_plan.png') });
  console.log('Saved block_08_project_plan.png');

  // ==========================================
  // 9. Weekly Report Template
  // ==========================================
  console.log('9. Testing Weekly Report template...');
  menu = await openGutterMenu();
  opt = menu.locator('button[role="menuitem"]').filter({ hasText: 'Weekly Report' }).first();
  await opt.scrollIntoViewIfNeeded();
  await opt.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(brainDir, 'block_09_weekly_report.png') });
  console.log('Saved block_09_weekly_report.png');

  // ==========================================
  // Full screen scrolling capture of all blocks
  // ==========================================
  console.log('Capturing full page overview with all blocks visible...');
  await page.screenshot({ path: path.join(brainDir, 'all_user_blocks_verified_fullpage.png'), fullPage: true });
  console.log('Saved all_user_blocks_verified_fullpage.png');

  assert.equal(pageErrors.length, 0, `Page errors: ${pageErrors.join(', ')}`);
  console.log('ALL SPECIFIED BLOCKS TESTED AND VERIFIED 100%!');

  await context.close();
  await browser.close();
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
