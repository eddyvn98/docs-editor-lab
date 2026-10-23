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
    assert.equal(await page.locator(".ProseMirror .doc-columns").count(),1,"sample columns preserved");
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
    await page.getByRole("button",{name:"Document tools"}).click();
    await page.getByRole("textbox",{name:"Find text"}).fill("Reference");
    await page.getByRole("button",{name:"Next match"}).click();
    await page.getByRole("button",{name:"Save version"}).click();
    await page.getByText("Version saved").waitFor();
    await page.getByRole("button",{name:"Close tools"}).click();
    await page.locator(".ProseMirror .image-figure img").click();
    await page.locator('input[aria-label="Upload local image"]').setInputFiles({
      name:"one-pixel.png",mimeType:"image/png",
      buffer:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jcW0AAAAASUVORK5CYII=","base64"),
    });
    await page.getByRole("button",{name:"Save",exact:true}).click();
    assert.ok((await page.locator(".image-figure img").first().getAttribute("src"))?.startsWith("data:image/png;base64"));
    const beforeWidth=await page.locator(".image-shell").first().evaluate(el=>el.style.width);
    const handle=page.getByRole("button",{name:"Resize image"}).first();
    const bound=await handle.boundingBox();
    assert.ok(bound);
    await page.mouse.move(bound.x+bound.width/2,bound.y+bound.height/2);
    await page.mouse.down();
    await page.mouse.move(bound.x-42,bound.y+bound.height/2,{steps:8});
    await page.mouse.up();
    const afterWidth=await page.locator(".image-shell").first().evaluate(el=>el.style.width);
    assert.notEqual(beforeWidth,afterWidth,"drag handle resizes image");
    const rows=await page.locator(".ProseMirror table tr").count();
    await page.locator(".ProseMirror td").first().click({button:"right"});
    await page.getByRole("menuitem",{name:"Insert row below"}).click();
    assert.equal(await page.locator(".ProseMirror table tr").count(),rows+1);
    await page.locator(".ProseMirror > p").last().hover();
    await page.getByRole("button",{name:"Add block"}).click();
    await page.getByRole("menuitem",{name:"Callout"}).waitFor();
    await page.keyboard.press("Escape");
    await page.locator(".ProseMirror > p").last().click();
    await page.keyboard.type("/heading");
    await page.getByRole("menuitem",{name:"Heading 2"}).waitFor();
    await page.getByRole("menuitem",{name:"Heading 2"}).click();
    assert.ok(await page.locator(".ProseMirror > h2").count()>=2);
    await page.locator(".ProseMirror > p").first().click({clickCount:3});
    await page.locator(".selection-bar").waitFor();
    await page.getByRole("button",{name:"B",exact:true}).click();
    await page.locator(".ProseMirror > p").first().click({clickCount:3});
    await page.getByRole("button",{name:"Comment",exact:true}).click();
    await page.getByPlaceholder("Leave a note on this block…").fill("Needs review");
    await page.getByRole("button",{name:"Add comment"}).click();
    assert.ok(await page.locator(".ProseMirror .comment-anchor").count()>0);
    assert.ok(await page.locator(".ProseMirror strong").count()>0);
    await page.locator(".ProseMirror > p").first().click();
    await page.keyboard.press("ControlOrMeta+k");
    await page.getByText("Edit link",{exact:true}).waitFor();
    await page.keyboard.press("Escape");
    await page.locator(".ProseMirror > p").first().click({button:"right"});
    await page.evaluate(()=>window.scrollTo(0,220));
    const anchored=await page.locator(".ux-menu").boundingBox();
    assert.ok(anchored && Number.isFinite(anchored.y));
    await page.evaluate(()=>window.scrollTo(0,0));
    const source=page.locator(".ProseMirror > h2").first();
    const destination=page.locator(".ProseMirror > p").first();
    await source.hover();
    const grip=page.getByRole("button",{name:"Drag or open block actions"});
    const from=await grip.boundingBox(),to=await destination.boundingBox();
    assert.ok(from&&to&&to.y>=0&&to.y<860,"grip and target are visible");
    await page.mouse.move(from.x+from.width/2,from.y+from.height/2);
    await page.mouse.down();
    await page.mouse.move(to.x+18,to.y+to.height*0.25,{steps:16});
    await page.mouse.up();
    assert.equal(await source.evaluate(el=>el.previousElementSibling?.tagName),"H1","drag moved heading above duplicate paragraphs");
    assert.deepEqual(errors,[]);
    await context.close();console.log("PASS Chromium width="+width);
  }
}
try{await run();}finally{await browser?.close();server.kill("SIGTERM");}
