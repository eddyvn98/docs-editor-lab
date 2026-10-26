// Local-only interaction suite. Never starts a GitHub Actions run.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const origin = process.env.TEST_BASE_URL || 'http://127.0.0.1:4178';
const server = process.env.TEST_BASE_URL ? null : spawn(process.execPath,
  ['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4178','--strictPort'], {stdio:'inherit'});
let browser;
async function ready() {
  for (let i=0;i<80;i++) { try { if ((await fetch(origin)).ok) return; } catch { /* Not ready. */ }
    await new Promise(resolve=>setTimeout(resolve,150)); }
  throw new Error('Local editor did not start.');
}
try {
  await ready(); browser = await chromium.launch({headless:true});
  for (const width of [1365,390]) {
    const context = await browser.newContext({viewport:{width,height:900}, permissions:['clipboard-read','clipboard-write']});
    await context.addInitScript(() => { window.__docsQaInspect = true; });
    const page = await context.newPage(), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin); const editor=page.locator('.ProseMirror'); await editor.waitFor();
    assert.equal(await page.locator('.format-dock').count(),0,'formatting is contextual, not pinned');
    // Diagnose missing fixture immediately; do not mask a product regression with timeout.
    const initialCodeControls=await editor.getByLabel('Code language').count();
    assert.ok(initialCodeControls>0, 'The isolated Docs fixture must contain a real code block and its Code language control');
    const targetParagraph=editor.locator('> p').first();
    await targetParagraph.selectText();
    const selection=await targetParagraph.evaluate(element => {
      const native=window.getSelection(), pm=window.__docsQaSelection?.();
      return { pm, nativeText:native?.toString() || '',
        within: !!native?.anchorNode && !!native?.focusNode &&
          element.contains(native.anchorNode) && element.contains(native.focusNode) };
    });
    assert.ok(selection.within, 'Selected text must stay inside the target paragraph');
    assert.ok(selection.nativeText.startsWith('Bold'), 'QA selects only the intended formatted sample');
    assert.equal(selection.pm?.fromParent, 'paragraph');
    assert.equal(selection.pm?.toParent, 'paragraph');
    assert.equal(selection.pm?.fromStart, selection.pm?.toStart, 'Never style multiple blocks');
    assert.equal(selection.pm?.fromOffset, 0, 'Selection starts at the paragraph boundary');
    assert.equal(selection.pm?.toOffset, selection.pm?.fromParentSize,
      'Selection ends at the same paragraph boundary');
    await page.getByRole('toolbar',{name:'Selection formatting'}).waitFor();
    await page.getByLabel('Selected text style').selectOption('h3');
    assert.ok(await editor.locator('h3').count()>0);
    await page.keyboard.press('Escape');
    // Convert-to-heading and Escape must not unmount the existing code NodeView.
    const codeAfterHeading=await editor.getByLabel('Code language').count();
    const diagnostic=await editor.evaluate(root => ({
      codeViews: root.querySelectorAll('.document-code-block').length,
      folded: root.querySelectorAll('.fold-hidden').length,
      codeHidden: [...root.querySelectorAll('.document-code-block')].map(el =>
        !!el.closest('.fold-hidden') || getComputedStyle(el).display === 'none'),
    }));
    assert.equal(codeAfterHeading,initialCodeControls,
      'H3 conversion/Escape must retain code controls; diagnostics: '+JSON.stringify(diagnostic));

    await page.getByRole('button',{name:'Callout appearance',exact:true}).first().click();
    const calloutSettings=page.getByRole('group',{name:'Callout settings'});
    await page.getByRole('button',{name:'Callout background #fff3cf',exact:true}).click();
    await calloutSettings.waitFor({state:'visible'});
    assert.equal(await page.getByRole('button',{name:'Callout appearance',exact:true}).first().getAttribute('aria-expanded'),'true',
      'Changing the callout background keeps its appearance palette open');
    await page.getByLabel('Callout text color').fill('#123456');
    await calloutSettings.waitFor({state:'visible'});
    assert.equal(await page.getByRole('button',{name:'Callout appearance',exact:true}).first().getAttribute('aria-expanded'),'true',
      'Changing the callout text color keeps its appearance palette open');
    await page.getByRole('button',{name:'Done',exact:true}).click();
    assert.equal(await editor.locator('.callout-card').first().evaluate(el=>el.style.backgroundColor),'rgb(255, 243, 207)');
    assert.equal(await editor.locator('.callout-card').first().evaluate(el=>el.style.color),'rgb(18, 52, 86)');

    assert.equal(await editor.getByLabel('Code language').count(),initialCodeControls,
      'Formatting a callout must not remove code block language controls');
    await editor.getByLabel('Code language').first().selectOption('javascript');
    assert.ok(await editor.locator('.code-token-keyword').count()>0);
    await editor.getByRole('button',{name:'Wrap code lines'}).first().click();
    assert.equal(await editor.locator('.document-code-block pre').first().getAttribute('data-wrap'),'true');
    await editor.getByRole('button',{name:'Copy code',exact:true}).first().click();
    await page.getByText('Copied',{exact:true}).waitFor();

    // Inline slash converts the paragraph after removing only its command token.
    await editor.locator('> p').last().click();
    await page.keyboard.type('Keep this sentence /heading 2');
    await page.getByRole('menuitem',{name:'Heading 2',exact:true}).click();
    assert.ok((await editor.locator('> h2').last().textContent()).includes('Keep this sentence'));
    assert.ok(!(await editor.locator('> h2').last().textContent()).includes('/heading'));
    await page.keyboard.press('ControlOrMeta+z');
    assert.ok((await editor.textContent()).includes('/heading 2'),'conversion is an independent undo step');
    await page.keyboard.press('ControlOrMeta+Shift+z');

    // Save a real code block; insert a standalone copy with new identity.
    const codeCount=await editor.locator('.document-code-block').count();
    await editor.locator('.document-code-block pre').first().click({button:'right'});
    await page.getByRole('menuitem',{name:'Save to My Templates'}).click();
    let dialog=page.getByRole('dialog',{name:'Save block template'});
    await dialog.getByLabel('Template name').fill('Reusable code');
    await dialog.getByRole('button',{name:'Save template',exact:true}).click();
    await page.getByRole('button',{name:'Templates',exact:true}).click();
    dialog=page.getByRole('dialog',{name:'Block templates'});
    await dialog.getByLabel('Search templates').fill('Reusable');
    await dialog.getByRole('button').filter({hasText:'Reusable code'}).first().click();
    await dialog.getByRole('button',{name:'Insert template',exact:true}).click();
    assert.equal(await editor.locator('.document-code-block').count(),codeCount+1);
    const ids=await editor.locator('[data-block-id]').evaluateAll(els=>els.map(el=>el.getAttribute('data-block-id')).filter(Boolean));
    assert.equal(new Set(ids).size,ids.length,'templates do not reuse block IDs');

    const figure=editor.locator('.image-figure').first(); await figure.hover();
    await figure.getByRole('button',{name:'Crop',exact:true}).click();
    dialog=page.getByRole('dialog',{name:'Crop image'});
    await dialog.getByLabel('Crop width',{exact:true}).fill('50');
    await dialog.getByLabel('Crop x',{exact:true}).fill('10');
    await dialog.getByRole('button',{name:'Apply crop',exact:true}).click();
    assert.ok(await figure.locator('.image-crop-viewport').evaluate(el=>!!el.style.aspectRatio));
    const source=await figure.locator('img').getAttribute('src');
    await figure.hover(); await figure.getByRole('button',{name:'Reset crop',exact:true}).click();
    assert.equal(await figure.locator('img').getAttribute('src'),source,'reset preserves original image');
    assert.equal(await figure.locator('.image-crop-viewport').evaluate(el=>el.style.aspectRatio),'');

    // Insert Below opens a picker rather than silently inserting plain text.
    await editor.locator('.document-code-block pre').first().click({button:'right'});
    await page.getByRole('menuitem',{name:'Insert below',exact:true}).click();
    dialog=page.getByRole('dialog',{name:'Insert a block'});
    await dialog.getByRole('combobox',{name:'Search blocks'}).fill('quote');
    const quotes=await editor.locator('blockquote').count();
    await dialog.getByRole('option').filter({hasText:'Quote'}).click();
    assert.equal(await editor.locator('blockquote').count(),quotes+1);

    await page.getByRole('button',{name:'Document view options'}).click();
    await page.getByRole('dialog',{name:'View options'}).getByLabel('Mode',{exact:true}).selectOption('read');
    await page.keyboard.press('Escape');
    assert.equal(await editor.getByLabel('Code language').first().isVisible(),false);
    assert.equal(await figure.getByRole('button',{name:'Crop',exact:true}).isVisible(),false);
    assert.deepEqual(errors,[]);
    console.log(`PASS Lark document surface width=${width}`); await context.close();
  }
} finally { await browser?.close(); server?.kill('SIGTERM'); }
