// Local-only browser acceptance, deliberately not added to CI.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true});
try{
 for(const width of [1365,390]){
  const context=await browser.newContext({viewport:{width,height:900}});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.EDITOR_URL||'http://127.0.0.1:5173');
  const editor=page.locator('.ProseMirror');
  await editor.waitFor();
  await page.getByRole('button',{name:'Document templates'}).click();
  const gallery=page.getByRole('dialog',{name:'Template gallery'});
  await gallery.locator('.template-card').filter({hasText:'Meeting Notes'}).click();
  await gallery.getByRole('region',{name:'Template preview'}).getByRole('heading',{name:'Meeting Notes',exact:true}).waitFor();
  await gallery.getByRole('button',{name:'Insert Meeting Notes'}).click();
  const inserted=editor.locator('h1,h2,h3,h4').filter({hasText:'Meeting Notes'});
  await inserted.waitFor();
  await page.getByRole('button',{name:'Undo'}).click();
  assert.equal(await inserted.count(),0,'one Undo removes the complete template');
  await page.getByRole('button',{name:'Insert block'}).click();
  let palette=page.getByRole('dialog',{name:'Insert a block'});
  await palette.getByRole('combobox',{name:'Search blocks'}).fill('Sheets');
  await palette.getByRole('option',{name:/Sheets/}).click();
  const sheet=editor.locator('.inline-sheet').last();await sheet.waitFor();
  assert.equal(await sheet.locator('tr').count(),2);
  assert.equal(await sheet.locator('tr').first().locator('td').count(),3);
  await sheet.getByRole('textbox',{name:'Cell 1,1'}).fill('QA value');
  assert.equal(await sheet.getByRole('textbox',{name:'Cell 1,1'}).inputValue(),'QA value');
  await sheet.getByRole('button',{name:'Find/replace'}).click();
  await sheet.getByRole('textbox',{name:'Find cells'}).fill('QA');
  await sheet.getByRole('textbox',{name:'Replace cells'}).fill('Review');
  await sheet.getByRole('button',{name:'Replace all'}).click();
  assert.equal(await sheet.getByRole('textbox',{name:'Cell 1,1'}).inputValue(),'Review value');
  for(const [query,kind] of [['Table of Contents','docsToc'],['Timeline','docsTimeline'],['Mermaid','docsMermaid']]){
   await page.getByRole('button',{name:'Insert block'}).click();
   palette=page.getByRole('dialog',{name:'Insert a block'});
   await palette.getByRole('combobox',{name:'Search blocks'}).fill(query);
   await palette.getByRole('option').filter({hasText:query}).click();
   const block=editor.locator('[data-type="'+kind+'"]').last();
   await block.waitFor(); assert.ok((await block.innerText()).trim().length>5);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS Docs parity viewport '+width);
  await context.close();
 }
}finally{await browser.close();}
