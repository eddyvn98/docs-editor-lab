import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const server=spawn(process.execPath,["node_modules/vite/bin/vite.js","--host","127.0.0.1","--port","4173"],{stdio:"pipe"});
let browser;
async function ready(){
  for(let i=0;i<75;i++){try{const r=await fetch("http://127.0.0.1:4173");if(r.ok)return;}catch{}
    await new Promise(r=>setTimeout(r,200));}
  throw new Error("Vite did not start");
}
async function run(){
  await ready();browser=await chromium.launch({headless:true});
  for(const width of [1365,390]){
    const context=await browser.newContext({viewport:{width,height:860}});
    const page=await context.newPage(), errors=[];
    page.on("pageerror",error=>errors.push(error.message));
    await page.goto("http://127.0.0.1:4173");
    await page.locator(".ProseMirror").waitFor();
    assert.ok(await page.locator(".ProseMirror > h1").count());
    await page.locator(".ProseMirror > p").first().click({button:"right"});
    await page.getByRole("menuitem",{name:"Duplicate"}).waitFor();
    const menu=await page.locator(".ux-menu").boundingBox();
    assert.ok(menu && menu.x>=0 && menu.x+menu.width<=width+1);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".ux-menu").count(),0);
    await page.locator(".ProseMirror > p").first().click({button:"right"});
    await page.getByRole("menuitem",{name:"Duplicate"}).click();
    assert.ok(await page.locator(".ProseMirror > p").count()>=3);
    await page.locator(".topbar").click();
    assert.equal(await page.locator(".ux-menu").count(),0);
    await page.locator(".ProseMirror .image-figure img").click();
    await page.getByPlaceholder("Describe the image").fill("Updated caption");
    await page.getByRole("button",{name:"Save",exact:true}).click();
    assert.ok(await page.getByText("Updated caption").count());
    const rows=await page.locator(".ProseMirror table tr").count();
    await page.locator(".ProseMirror td").first().click({button:"right"});
    await page.getByRole("menuitem",{name:"Insert row below"}).click();
    assert.equal(await page.locator(".ProseMirror table tr").count(),rows+1);
    await page.locator(".ProseMirror > p").last().click();
    await page.keyboard.type("/heading");
    await page.getByRole("menuitem",{name:"Heading 2"}).waitFor();
    await page.getByRole("menuitem",{name:"Heading 2"}).click();
    assert.ok(await page.locator(".ProseMirror > h2").count()>=2);
    await page.locator(".ProseMirror > p").first().click({clickCount:3});
    await page.locator(".selection-bar").waitFor();
    await page.getByRole("button",{name:"B",exact:true}).click();
    assert.ok(await page.locator(".ProseMirror strong").count()>0);
    await page.locator(".ProseMirror > p").first().click({button:"right"});
    await page.evaluate(()=>window.scrollTo(0,220));
    const anchored=await page.locator(".ux-menu").boundingBox();
    assert.ok(anchored && Number.isFinite(anchored.y));
    assert.deepEqual(errors,[]);
    await context.close();console.log("PASS Chromium width="+width);
  }
}
try{await run();}finally{await browser?.close();server.kill("SIGTERM");}
