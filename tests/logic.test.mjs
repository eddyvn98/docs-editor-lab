import test from "node:test";
import assert from "node:assert/strict";
import { actionsFor, filterInserts, kindFor, placeOverlay, slashQuery } from "../src/logic.ts";

test("slash recognizes empty-line queries",()=>{assert.equal(slashQuery("/"),"");assert.equal(slashQuery("/Heading 2"),"heading 2");assert.equal(slashQuery("before /head"),null);assert.equal(slashQuery("/bad!"),null);});
test("search is case-insensitive",()=>{assert.deepEqual(filterInserts("HEAD").map(x=>x.id),["h1","h2","h3"]);assert.deepEqual(filterInserts("table").map(x=>x.id),["table"]);assert.equal(filterInserts("xyz").length,0);});
test("links expose link actions, not block deletion",()=>{assert.deepEqual(actionsFor("link").map(x=>x.id),["link-open","link-edit","link-copy","link-remove"]);});
test("images have their own actions",()=>{const a=actionsFor("image").map(x=>x.id);assert.ok(a.includes("image-edit")&&a.includes("image-download")&&a.includes("delete")&&!a.includes("row-add"));});
test("cells allow row and column edits",()=>{const a=actionsFor("cell").map(x=>x.id);assert.ok(["row-add","row-delete","col-add","col-delete","table-delete"].every(x=>a.includes(x)));});
test("divider excludes inapplicable formatting",()=>{assert.deepEqual(actionsFor("horizontalRule").map(x=>x.id),["insert-below","duplicate","delete"]);});
test("paragraph converts and aligns",()=>{const a=actionsFor("paragraph").map(x=>x.id);assert.ok(["h1","quote","callout","align-center","comment"].every(x=>a.includes(x)));});
test("normalize unknown block kinds",()=>{assert.equal(kindFor("taskList"),"taskList");assert.equal(kindFor("unknown"),"text");});
test("overlay clamps desktop geometry",()=>{assert.deepEqual(placeOverlay({x:1000,y:900},{width:270,height:320},{width:1024,height:768}),{x:746,y:440});});
test("overlay clamps mobile geometry",()=>{assert.deepEqual(placeOverlay({x:-20,y:-30},{width:280,height:200},{width:360,height:600}),{x:8,y:8});assert.deepEqual(placeOverlay({x:0,y:0},{width:600,height:800},{width:350,height:500}),{x:8,y:8});});
test("every menu has unique ids",()=>{for(const k of ["text","paragraph","image","table","cell","link","codeBlock","callout","horizontalRule"]){const a=actionsFor(k);assert.equal(new Set(a.map(x=>x.id)).size,a.length,k);}});
