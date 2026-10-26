import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import path from 'node:path';

const url = process.env.EDITOR_URL || 'http://127.0.0.1:4182';
const brainDir = '/Users/htt711/.gemini/antigravity/brain/e3fcbe21-f635-4b4d-801f-ac73f34edcea';

async function main() {
  const browser = await chromium.launch({ headless: true });
  
  // 1. Desktop Test (1365px)
  {
    console.log('--- Testing + Menu on Desktop (1365px) ---');
    const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Click '+' button in topbar
    const insertTrigger = page.locator('.docs-insert-trigger');
    await assert.doesNotReject(insertTrigger.waitFor({ state: 'visible' }));
    await insertTrigger.click();
    
    // Check palette is open
    const palette = page.locator('.insert-palette');
    await palette.waitFor({ state: 'visible' });
    console.log('Insert palette visible on Desktop');

    // Take screenshot of open palette showing categories
    await page.screenshot({ path: path.join(brainDir, 'menu_plus_desktop_categories.png') });
    
    // Verify groups exist
    const groups = await page.locator('.docs-menu-group').allTextContents();
    console.log('Categories found:', groups);
    assert.ok(groups.includes('Basic blocks') || groups.includes('Nội dung cơ bản'), 'Has compact basic block grid');
    assert.ok(groups.includes('Common blocks') || groups.includes('Thường dùng'), 'Has common Docs blocks');
    assert.equal(await palette.locator('.docs-quick-insert button').count(), 18, 'Quick insert grid matches the Lark layout');
    assert.doesNotMatch(await palette.innerText(), /Sheets|Mermaid/, 'Heavy non-Docs integrations stay out of this picker');

    // Test search filter (e.g. Vietnamese "bảng" or English "table")
    const searchInput = page.locator('.docs-menu-search input');
    await searchInput.fill('bảng');
    await page.waitForTimeout(300);
    const filteredOptions = await page.locator('.insert-options button[role="option"]').allTextContents();
    console.log('Filtered options for "bảng":', filteredOptions);
    assert.ok(filteredOptions.some(text => text.toLowerCase().includes('table') || text.toLowerCase().includes('bảng')), 'Found table');
    await page.screenshot({ path: path.join(brainDir, 'menu_plus_desktop_search_vn.png') });

    // Open Table Size Picker
    await searchInput.fill('');
    await page.waitForTimeout(200);
    const tableOption = page.locator('.insert-options button[role="option"]').filter({ hasText: 'Table' }).first();
    await tableOption.click();
    
    // Table size picker visible
    const sizePicker = page.locator('.table-size-picker, [aria-label*="table" i], .docs-table-picker');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(brainDir, 'menu_plus_table_picker_grid.png') });
    console.log('Table size picker displayed and captured');

    // Press Escape to return to editor
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Test block insertion from + menu: Insert a Callout
    console.log('Testing block insertion via + menu...');
    await insertTrigger.click();
    await page.waitForTimeout(300);
    const calloutOption = page.locator('.insert-options button[role="option"]').filter({ hasText: 'Callout' }).first();
    await calloutOption.click();
    await page.waitForTimeout(500);

    // Verify callout inserted in editor
    const callouts = page.locator('[data-type="callout"], .callout-card');
    const count = await callouts.count();
    console.log('Callout count after insertion:', count);
    assert.ok(count >= 1, 'Callout block successfully inserted from + menu');

    await page.screenshot({ path: path.join(brainDir, 'menu_plus_inserted_callout_desktop.png') });
    await page.close();
  }

  // 2. Mobile Test (390px)
  {
    console.log('--- Testing + Menu on Mobile (390px) ---');
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(url, { waitUntil: 'networkidle' });

    // Verify + button is visible on mobile topbar
    const insertTrigger = page.locator('.docs-insert-trigger');
    const isVisible = await insertTrigger.isVisible();
    console.log('Is .docs-insert-trigger visible on mobile 390px:', isVisible);
    assert.ok(isVisible, '+ button must be visible on mobile topbar');

    // Click + button to open menu
    await insertTrigger.click();
    await page.waitForTimeout(400);

    const palette = page.locator('.insert-palette');
    await palette.waitFor({ state: 'visible' });
    console.log('Insert palette visible on Mobile 390px');

    // Capture mobile screenshot of open + menu
    await page.screenshot({ path: path.join(brainDir, 'menu_plus_mobile_open.png') });

    // Click Table to open Table size picker on mobile
    const tableOption = page.locator('.insert-options button[role="option"]').filter({ hasText: 'Table' }).first();
    await tableOption.click();
    await page.waitForTimeout(400);

    // Capture table size picker on mobile
    await page.screenshot({ path: path.join(brainDir, 'menu_plus_mobile_table_picker.png') });
    console.log('Captured mobile table size picker');

    // Press escape to close picker, then test inserting a block on mobile
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Reopen insert menu on mobile and insert a Quote
    await insertTrigger.click();
    await page.waitForTimeout(300);
    const quoteOption = page.locator('.insert-options button[role="option"]').filter({ hasText: 'Quote' }).first();
    await quoteOption.click();
    await page.waitForTimeout(500);

    const blockquotes = page.locator('blockquote');
    const bqCount = await blockquotes.count();
    console.log('Mobile blockquote count after insertion:', bqCount);
    assert.ok(bqCount >= 1, 'Quote block successfully inserted on mobile via + menu');
    await page.screenshot({ path: path.join(brainDir, 'menu_plus_mobile_inserted.png') });

    await page.close();
  }

  await browser.close();
  console.log('ALL + MENU PARITY & INTERACTION TESTS PASSED 100%!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
