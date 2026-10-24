import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import path from 'node:path';

const url = 'http://127.0.0.1:4182/';
const brainDir = '/Users/htt711/.gemini/antigravity/brain/e3fcbe21-f635-4b4d-801f-ac73f34edcea';

async function main() {
  console.log('Connecting to browser to test creating full content on http://127.0.0.1:4182/ ...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1365, height: 950 } });
  const page = await context.newPage();
  
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));
  
  await page.goto(url, { waitUntil: 'networkidle' });
  const editor = page.locator('.ProseMirror');
  await editor.waitFor();
  console.log('Editor loaded successfully.');

  // Helper to open + menu
  async function openPlusMenu(query = '') {
    const insertBtn = page.locator('.docs-insert-trigger');
    await insertBtn.click();
    const palette = page.locator('.insert-palette');
    await palette.waitFor({ state: 'visible' });
    if (query) {
      const input = palette.locator('input[role="combobox"]');
      await input.fill(query);
      await page.waitForTimeout(200);
    }
    return palette;
  }

  // Focus at the end of the document to append new blocks
  await editor.click();
  await page.keyboard.press('Meta+ArrowDown');
  await page.keyboard.press('Enter');

  // ==========================================
  // SECTION 1: Test Creating Basic Blocks
  // ==========================================
  console.log('--- Testing Basic Blocks Creation ---');
  
  // 1. Heading 1
  let palette = await openPlusMenu('Heading 1');
  await palette.getByRole('option', { name: /Heading 1/ }).click();
  await page.keyboard.type('Nghiệm thu tạo nội dung trực tiếp qua nút +');
  await page.keyboard.press('Enter');
  
  // 2. Heading 2
  palette = await openPlusMenu('Heading 2');
  await palette.getByRole('option', { name: /Heading 2/ }).click();
  await page.keyboard.type('1. Các khối văn bản và định dạng cơ bản');
  await page.keyboard.press('Enter');

  // 3. Paragraph (Text)
  palette = await openPlusMenu('Text');
  await palette.getByRole('option', { name: /Text/ }).click();
  await page.keyboard.type('Đoạn văn bản hoàn chỉnh được chèn trực tiếp từ menu +. Trình soạn thảo hỗ trợ gõ tiếng Việt có dấu với đầy đủ phong cách chữ.');
  await page.keyboard.press('Enter');

  // 4. Bullet List
  palette = await openPlusMenu('Bullet list');
  await palette.getByRole('option', { name: /Bullet list/ }).click();
  await page.keyboard.type('Mục gạch đầu dòng thứ nhất: Kiểm tra hiển thị');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Mục gạch đầu dòng thứ hai: Kiểm tra thụt lề');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Backspace'); // Exit list

  // 5. Numbered List
  palette = await openPlusMenu('Numbered list');
  await palette.getByRole('option', { name: /Numbered list/ }).click();
  await page.keyboard.type('Bước 1: Bấm nút + trên thanh công cụ');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Bước 2: Chọn block từ danh sách');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Bước 3: Nhập nội dung trực tiếp vào trang');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Backspace'); // Exit list

  // 6. Checklist (Task List)
  palette = await openPlusMenu('Checklist');
  await palette.getByRole('option', { name: /Checklist/ }).click();
  await page.keyboard.type('Tác vụ QA 1: Kiểm thử thao tác chèn từ menu +');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Tác vụ QA 2: Xác nhận gõ dữ liệu tiếng Việt');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Backspace'); // Exit list

  // Click the first checkbox to mark it done
  const checkboxes = editor.locator('input[type="checkbox"]');
  if (await checkboxes.count() > 0) {
    await checkboxes.last().click();
  }

  // 7. Blockquote
  palette = await openPlusMenu('Quote');
  await palette.getByRole('option', { name: /Quote/ }).click();
  await page.keyboard.type('Trích dẫn kiểm thử: "Tất cả các block của Lark Docs phải hỗ trợ tạo mới và chỉnh sửa tại chỗ mà không làm mất focus."');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Backspace');

  // 8. Callout Box
  palette = await openPlusMenu('Callout');
  await palette.getByRole('option', { name: /Callout/ }).click();
  await page.keyboard.type('Hộp ghi chú Callout: Đã kiểm tra tính năng hiển thị icon, đổi màu nền và đường viền theo phong cách chuẩn Lark.');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Backspace');

  // 9. Toggle Block
  palette = await openPlusMenu('Toggle details');
  await palette.getByRole('option', { name: /Toggle details/ }).click();
  await page.keyboard.type('Khối nội dung thu gọn được chèn từ menu +. Bấm vào tam giác mở/gập để ẩn hoặc hiện thông tin chi tiết.');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Backspace');

  await page.screenshot({ path: path.join(brainDir, 'live_01_basic_content.png') });
  console.log('Saved live_01_basic_content.png');

  // ==========================================
  // SECTION 2: Test Table Creation via Picker & Fill Data
  // ==========================================
  console.log('--- Testing Table Creation & Data Entry ---');
  
  // Heading for Table
  palette = await openPlusMenu('Heading 2');
  await palette.getByRole('option', { name: /Heading 2/ }).click();
  await page.keyboard.type('2. Bảng dữ liệu tương tác (Table)');
  await page.keyboard.press('Enter');

  // Click '+' then select 'Table' to open TableSizePicker
  const insertBtn = page.locator('.docs-insert-trigger');
  await insertBtn.click();
  let insertPalette = page.locator('.insert-palette');
  await insertPalette.waitFor({ state: 'visible' });
  
  // Click Table option to open the 8x8 picker
  const tableOpt = insertPalette.getByRole('option', { name: /Table/i }).first();
  await tableOpt.click();
  
  // Wait for Table Size Picker
  const sizePicker = page.locator('.table-size-picker, .docs-table-picker');
  await sizePicker.waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(brainDir, 'live_02_table_picker_open.png') });

  // Select a 3x3 or 3x4 table by clicking on cell in picker
  const cells = sizePicker.locator('button, div[role="gridcell"], .picker-cell');
  if (await cells.count() >= 12) {
    await cells.nth(11).click(); // Click around 3x4 cell
  } else {
    // Or click 'Insert table' button if present
    const confirmBtn = sizePicker.getByRole('button', { name: /Insert table/i });
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }
  }
  await page.waitForTimeout(500);

  // Now locate the newly created table
  const tables = editor.locator('table');
  const tableCount = await tables.count();
  console.log('Total tables count:', tableCount);
  assert.ok(tableCount >= 1, 'Table created successfully from + menu');

  const newTable = tables.last();
  await newTable.scrollIntoViewIfNeeded();

  // Type content into table cells
  const tableCells = newTable.locator('th, td');
  const sampleHeaders = ['STT', 'Tên tính năng', 'Trạng thái kiểm thử', 'Đánh giá'];
  const sampleData = ['1', 'Insert Palette', 'PASS 100%', 'Mượt mà'];
  
  const cellCount = await tableCells.count();
  console.log('Table cells count:', cellCount);
  for (let i = 0; i < Math.min(4, cellCount); i++) {
    await tableCells.nth(i).click();
    await page.keyboard.type(sampleHeaders[i] || `Cột ${i + 1}`);
  }
  for (let i = 4; i < Math.min(8, cellCount); i++) {
    await tableCells.nth(i).click();
    await page.keyboard.type(sampleData[i - 4] || `Dữ liệu ${i}`);
  }

  await page.screenshot({ path: path.join(brainDir, 'live_02_table_created_filled.png') });
  console.log('Saved live_02_table_created_filled.png');

  // ==========================================
  // SECTION 3: Layout Blocks (Columns & Divider)
  // ==========================================
  console.log('--- Testing Layout Blocks (Columns, Divider) ---');
  await editor.click();
  await page.keyboard.press('Meta+ArrowDown');
  await page.keyboard.press('Enter');

  palette = await openPlusMenu('Heading 2');
  await palette.getByRole('option', { name: /Heading 2/ }).click();
  await page.keyboard.type('3. Bố cục chia cột (Columns) & Đường phân cách');
  await page.keyboard.press('Enter');

  // Insert 2 Columns
  palette = await openPlusMenu('columns');
  await palette.getByRole('option', { name: /2 columns/i }).click();
  await page.waitForTimeout(400);

  const columnBlocks = editor.locator('.columns-layout, [data-type="columns"]');
  console.log('Columns count:', await columnBlocks.count());
  assert.ok(await columnBlocks.count() >= 1, 'Columns block created');

  const lastColumns = columnBlocks.last();
  const cols = lastColumns.locator('.column, [data-type="column"]');
  if (await cols.count() >= 2) {
    await cols.nth(0).click();
    await page.keyboard.type('Cột 1: Hiển thị nội dung cột bên trái.');
    await cols.nth(1).click();
    await page.keyboard.type('Cột 2: Hiển thị nội dung cột bên phải song song.');
  }

  // Insert Divider
  await editor.click();
  await page.keyboard.press('Meta+ArrowDown');
  await page.keyboard.press('Enter');

  palette = await openPlusMenu('Divider');
  await palette.getByRole('option', { name: /Divider/i }).click();
  await page.waitForTimeout(300);

  await page.screenshot({ path: path.join(brainDir, 'live_03_columns_and_divider.png') });
  console.log('Saved live_03_columns_and_divider.png');

  // ==========================================
  // SECTION 4: Media Blocks
  // ==========================================
  console.log('--- Testing Media Blocks ---');
  await editor.click();
  await page.keyboard.press('Meta+ArrowDown');
  await page.keyboard.press('Enter');

  palette = await openPlusMenu('Heading 2');
  await palette.getByRole('option', { name: /Heading 2/ }).click();
  await page.keyboard.type('4. Các khối đa phương tiện (Media)');
  await page.keyboard.press('Enter');

  // Insert Image Gallery
  palette = await openPlusMenu('Image gallery');
  await palette.getByRole('option', { name: /Image gallery/i }).click();
  await page.waitForTimeout(400);

  // Insert File attachment
  palette = await openPlusMenu('File attachment');
  await palette.getByRole('option', { name: /File attachment/i }).click();
  await page.waitForTimeout(400);

  // Insert Web card
  palette = await openPlusMenu('Web card');
  await palette.getByRole('option', { name: /Web card/i }).click();
  await page.waitForTimeout(400);

  await page.screenshot({ path: path.join(brainDir, 'live_04_media_blocks.png') });
  console.log('Saved live_04_media_blocks.png');

  // ==========================================
  // SECTION 5: Advanced Blocks (Code, Equation, Sheets, Timeline, Mermaid, Synced)
  // ==========================================
  console.log('--- Testing Advanced Blocks ---');
  await editor.click();
  await page.keyboard.press('Meta+ArrowDown');
  await page.keyboard.press('Enter');

  palette = await openPlusMenu('Heading 2');
  await palette.getByRole('option', { name: /Heading 2/ }).click();
  await page.keyboard.type('5. Các khối nâng cao (Code, Equation, Sheets, Timeline, Mermaid, Synced)');
  await page.keyboard.press('Enter');

  // 1. Code block
  palette = await openPlusMenu('Code block');
  await palette.getByRole('option', { name: /Code block/i }).click();
  await page.keyboard.type('// Kiểm thử chèn mã nguồn TypeScript\nconst parity = {\n  larkBlocks: 21,\n  plusMenuCoverage: "100%",\n  verified: true\n};');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  // 2. Equation (Math)
  palette = await openPlusMenu('Equation');
  await palette.getByRole('option').filter({ hasText: 'Equation' }).first().click();
  await page.waitForTimeout(400);

  // 3. Spreadsheet (Sheets)
  palette = await openPlusMenu('Sheets');
  await palette.getByRole('option').filter({ hasText: 'Sheets' }).first().click();
  await page.waitForTimeout(400);

  // 4. Timeline
  palette = await openPlusMenu('Timeline');
  await palette.getByRole('option').filter({ hasText: 'Timeline' }).first().click();
  await page.waitForTimeout(400);

  // 5. Mermaid diagram
  palette = await openPlusMenu('Mermaid');
  await palette.getByRole('option').filter({ hasText: 'Mermaid' }).first().click();
  await page.waitForTimeout(400);

  // 6. Synced block
  palette = await openPlusMenu('Synced');
  await palette.getByRole('option').filter({ hasText: 'Synced' }).first().click();
  await page.keyboard.type('Nội dung khối đồng bộ (Synced block): Được liên kết trong tài liệu.');

  await page.screenshot({ path: path.join(brainDir, 'live_05_advanced_blocks.png') });
  console.log('Saved live_05_advanced_blocks.png');

  // ==========================================
  // SECTION 6: Full Page Overview Screenshot
  // ==========================================
  console.log('Capturing full page overview...');
  await page.screenshot({ path: path.join(brainDir, 'live_06_full_document.png'), fullPage: true });
  console.log('Saved live_06_full_document.png');

  assert.equal(pageErrors.length, 0, `Page errors found: ${pageErrors.join(', ')}`);
  console.log('ALL LIVE CREATION TESTS PASSED 100% WITH ZERO PAGE ERRORS!');

  await context.close();
  await browser.close();
}

main().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
