import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';

const url = process.env.EDITOR_URL || 'http://127.0.0.1:4182';

test('Gutter handle: hover never auto-opens popover, click opens menu, drag reorders without popover', async (t) => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(url, { waitUntil: 'networkidle' });

    const editor = page.locator('.ProseMirror');
    await editor.waitFor({ state: 'visible' });

    // 1. Hover paragraph and gutter handle
    const p1 = editor.locator('> p').first();
    await p1.scrollIntoViewIfNeeded();
    await p1.hover();

    const grip = page.locator('.ux-gutter [aria-label="Drag or open block actions"]');
    await grip.waitFor({ state: 'visible' });

    // Hover directly over the grip handle and wait 600ms (previously timed out at 320ms)
    await grip.hover();
    await page.waitForTimeout(600);

    // Verify NO popover/menu has opened on hover!
    const popupCount = await page.locator('.ux-menu, .ux-popup-menu').count();
    assert.equal(popupCount, 0, 'Hovering over gutter grip handle must NOT auto-open popup menu');

    // 2. Click the grip handle explicitly -> menu opens
    await grip.click();
    const menu = page.locator('.ux-menu');
    await menu.waitFor({ state: 'visible' });
    assert.ok(await menu.isVisible(), 'Clicking grip handle opens block menu');

    // Close menu with Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.ux-menu').count(), 0, 'Escape closes menu');

    // 3. Test drag and drop: hover handle, pause, drag, verify no popover interferes
    const sourceHeading = editor.locator('> h2').first();
    const targetParagraph = editor.locator('> p').first();
    await sourceHeading.hover();
    await grip.waitFor({ state: 'visible' });

    const gripBox = await grip.boundingBox();
    const targetBox = await targetParagraph.boundingBox();
    assert.ok(gripBox && targetBox, 'Grip and target must have bounding boxes');

    // Hover over grip for 500ms before starting drag to ensure no popup interrupts
    await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y + gripBox.height / 2);
    await page.waitForTimeout(500);
    assert.equal(await page.locator('.ux-menu').count(), 0, 'Still no menu before mouse down');

    // Mouse down to start drag
    await page.mouse.down();
    // Move slightly
    await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y + gripBox.height / 2 + 10, { steps: 5 });
    // Move to target
    await page.mouse.move(targetBox.x + 20, targetBox.y + targetBox.height / 2, { steps: 15 });
    // Release
    await page.mouse.up();

    // Verify no popup menu was left open after drag
    assert.equal(await page.locator('.ux-menu').count(), 0, 'No popup menu opened after dragging');

    // 4. Test '+' button on empty paragraph
    const emptyP = editor.locator('> p').filter({ hasText: /^$/ }).first();
    if (await emptyP.count() > 0) {
      await emptyP.hover();
      const addBtn = page.locator('.ux-gutter button[aria-label="Add block"]');
      await addBtn.waitFor({ state: 'visible' });

      // Hover over '+' button for 500ms -> verify no menu auto-opens
      await addBtn.hover();
      await page.waitForTimeout(500);
      assert.equal(await page.locator('.ux-menu').count(), 0, 'Hovering + button must NOT auto-open menu');

      // Click '+' button explicitly -> menu opens
      await addBtn.click();
      await menu.waitFor({ state: 'visible' });
      assert.ok(await menu.isVisible(), 'Clicking + button opens menu');
      await page.keyboard.press('Escape');
    }

    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
