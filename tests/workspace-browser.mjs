import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const port=4177, origin=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'pipe'});
let log='', browser;
server.stdout.on('data',chunk=>{log=(log+chunk).slice(-5000);});
server.stderr.on('data',chunk=>{log=(log+chunk).slice(-5000);});
async function ready(){
  for(let i=0;i<60;i++){
    if(server.exitCode!==null)throw new Error(`Vite exited: ${log}`);
    try{if((await fetch(origin)).ok)return;}catch{/* Not ready. */}
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  throw new Error(`Vite did not start: ${log}`);
}
try{
  await ready();browser=await chromium.launch({headless:true});
  for(const width of [1365,390]){
    const context=await browser.newContext({viewport:{width,height:900}});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));await page.goto(origin);
    const editor=page.locator('.ProseMirror');await editor.waitFor();
    assert.equal(await page.locator('.format-dock').count(),0);
    const format=page.getByRole('toolbar',{name:'Selection formatting'});
    await editor.locator('> p').first().click();await page.keyboard.press('Home');await page.keyboard.press('Shift+End');
    await format.waitFor();await format.getByRole('button',{name:'B',exact:true}).click();
    assert.ok(await editor.locator('strong').count()>0);await page.keyboard.press('Escape');
    const paragraphs=await editor.locator('> p').allTextContents();
    await editor.locator('.heading-fold-toggle').first().click();
    assert.ok(await editor.locator('> .fold-hidden').count()>0);
    assert.deepEqual(await editor.locator('> p').allTextContents(),paragraphs);
    await editor.locator('.heading-fold-toggle').first().click();
    assert.equal(await editor.locator('> .fold-hidden').count(),0);
    await editor.locator('> p').first().click();
    const original=await editor.locator('> p').first().textContent();
    const callouts=await editor.locator('aside[data-type="callout"]').count();
    await page.getByRole('button',{name:'Insert block',exact:true}).click();
    let palette=page.getByRole('dialog',{name:'Insert a block'});
    await palette.getByRole('combobox',{name:'Search blocks'}).fill('callout');
    await palette.getByRole('option').filter({hasText:'Callout'}).click();
    assert.equal(await editor.locator('> p').first().textContent(),original);
    assert.equal(await editor.locator('aside[data-type="callout"]').count(),callouts+1);
    await page.getByRole('button',{name:'Insert block',exact:true}).click();
    palette=page.getByRole('dialog',{name:'Insert a block'});
    await palette.getByLabel('New table rows').fill('2');await palette.getByLabel('New table columns').fill('4');
    await palette.getByRole('combobox',{name:'Search blocks'}).fill('table');
    await palette.getByRole('option').filter({hasText:'Table'}).click();
    const table=editor.locator('table').filter({has:page.locator('tr:first-child > th:nth-child(4)')}).first();
    assert.equal(await table.locator('tr').count(),2);assert.equal(await table.locator('th,td').count(),8);
    await table.locator('td').first().click();
    const tableBar=page.getByRole('toolbar',{name:'Table formatting'});
    await tableBar.getByRole('button',{name:'Select row',exact:true}).click();
    await tableBar.getByRole('button',{name:'Merge',exact:true}).click();assert.equal(await table.locator('th,td').count(),5);
    await tableBar.getByRole('button',{name:'Split',exact:true}).click();assert.equal(await table.locator('th,td').count(),8);
    await table.locator('td').first().click();await tableBar.getByLabel('Cell background').selectOption('#e8f0fe');
    assert.equal(await table.locator('td').first().getAttribute('data-cell-background'),'#e8f0fe');
    await editor.locator('.image-figure img').first().dblclick();
    await page.getByRole('dialog',{name:'Image viewer'}).waitFor();
    await page.getByRole('slider',{name:'Image zoom'}).focus();await page.keyboard.press('End');
    assert.equal(await page.getByRole('slider',{name:'Image zoom'}).inputValue(),'250');
    await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog',{name:'Image viewer'}).count(),0);
    await page.getByRole('button',{name:'Document view options'}).click();
    let view=page.getByRole('dialog',{name:'View options'});
    await view.getByLabel('Mode',{exact:true}).selectOption('read');
    await page.waitForFunction(()=>document.querySelector('.ProseMirror')?.getAttribute('contenteditable')==='false');
    assert.equal(await format.count(),0);
    assert.equal(await page.getByLabel('Document title',{exact:true}).getAttribute('readonly'),'');
    assert.equal(await page.getByRole('button',{name:'Open current block actions'}).count(),0);
    await page.keyboard.press('Escape');await page.getByRole('button',{name:'Edit',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.ProseMirror')?.getAttribute('contenteditable')==='true');
    await page.getByRole('button',{name:'Document view options'}).click();view=page.getByRole('dialog',{name:'View options'});
    await view.getByLabel('Focus mode').check();await view.getByLabel('Dark appearance').check();await page.keyboard.press('Escape');
    assert.equal(await page.locator('.app-shell').getAttribute('data-theme'),'dark');
    assert.equal(await page.getByLabel('Document navigation').count(),0);
    await page.getByRole('button',{name:'Exit focus'}).click();assert.equal(await page.getByLabel('Document navigation').count(),1);
    await page.reload();assert.equal(await page.locator('.app-shell').getAttribute('data-theme'),'dark');
    assert.ok((await page.locator('body').boundingBox()).width<=width);assert.deepEqual(errors,[]);
    console.log(`PASS workspace contextual toolbar/folding/insertion/table/reader/dialogs width=${width}`);await context.close();
  }
}finally{await browser?.close();server.kill('SIGTERM');}
