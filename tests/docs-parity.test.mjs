import test from 'node:test';
import assert from 'node:assert/strict';
import {emptySheet,normalizeSheet,sheetUpdate,sheetReplace} from '../src/sheetModel.ts';
import { DOCUMENT_TEMPLATES,searchTemplates } from '../src/features/templates.ts';
import {filterInserts} from '../src/logic.ts';
test('default inline sheet is editable 3 columns x 2 rows',()=>{
 const grid=emptySheet();assert.equal(grid.cells.length,2);assert.equal(grid.cells[0].length,3);
 assert.equal(sheetUpdate(grid,0,1,'hello').cells[0][1],'hello');
 assert.equal(grid.cells[0][1],'');
});
test('invalid sheet data is bounded and safe',()=>{
 const sheet=normalizeSheet({cells:Array.from({length:150},()=>Array(40).fill('x'.repeat(4000))),styles:{'0:0':{color:'url(fake)',bold:true}}});
 assert.equal(sheet.cells.length,100);assert.equal(sheet.cells[0].length,26);
 assert.equal(sheet.cells[0][0].length,2000);assert.equal(sheet.styles['0:0'].color,undefined);
 assert.equal(sheet.styles['0:0'].bold,true);
});
test('find and replace changes cells and leaves original untouched',()=>{
 const grid=sheetUpdate(emptySheet(),1,2,'foo foo');
 const replaced=sheetReplace(grid,'foo','bar');
 assert.equal(replaced.cells[1][2],'bar bar');assert.equal(grid.cells[1][2],'foo foo');
});
test('required Lark-like templates have unique IDs and nonempty content',()=>{
 for(const id of ['meeting','plan','weekly','swot','implementation']){
  const template=DOCUMENT_TEMPLATES.find(x=>x.id===id);
  assert.ok(template);assert.ok(template.content.length>=2);
 }
 assert.equal(new Set(DOCUMENT_TEMPLATES.map(x=>x.id)).size,DOCUMENT_TEMPLATES.length);
 assert.equal(searchTemplates('Meeting Notes')[0].id,'meeting');
});
test('Vietnamese slash /Mẫu exposes shortcuts and gallery',()=>{
 const ids=filterInserts('Mẫu').map(item=>item.id);
 assert.ok(ids.includes('template-meeting'));assert.ok(ids.includes('templates-gallery'));
});
test('Sheets ToC Timeline Mermaid are available from slash',()=>{
 for(const query of ['Sheets','Table of Contents','Timeline','Mermaid'])assert.equal(filterInserts(query).length,1);
});