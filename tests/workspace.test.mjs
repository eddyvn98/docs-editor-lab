import test from 'node:test';
import assert from 'node:assert/strict';
import { headingSections, hiddenByHeading, revealHeadings, activeHeading, foldedSpanEnd } from '../src/outlineModel.ts';
import { parseView, defaultView } from '../src/viewPreferences.ts';
import { blankBlock, tableDimensions } from '../src/blockCatalog.ts';
const blocks = [
  {pos:0,size:10,type:'heading',level:1,id:'root',text:'Root'},
  {pos:10,size:10,type:'paragraph',text:'Lead'},
  {pos:20,size:10,type:'heading',level:2,id:'a',text:'A'},
  {pos:30,size:10,type:'paragraph',text:'A body'},
  {pos:40,size:10,type:'heading',level:3,id:'detail',text:'Detail'},
  {pos:50,size:10,type:'paragraph',text:'Detail body'},
  {pos:60,size:10,type:'heading',level:2,id:'b',text:'B'},
  {pos:70,size:10,type:'paragraph',text:'B body'},
  {pos:80,size:10,type:'heading',level:1,id:'next',text:'Next'},
  {pos:90,size:10,type:'paragraph',text:'Next body'},
];
const sections = headingSections(blocks,100);
test('section ranges end at the next equal or higher heading',()=>assert.deepEqual(sections.map(s=>[s.id,s.end]),[['root',80],['a',60],['detail',60],['b',80],['next',100]]));
test('nested parents retain their own section',()=>assert.deepEqual(sections.map(s=>s.parentId),[null,'root','a','root',null]));
test('folding does not hide its own heading',()=>assert.equal(hiddenByHeading(20,sections,new Set(['a'])),false));
test('folding hides nested headings and body',()=>{for(const p of [30,40,50])assert.equal(hiddenByHeading(p,sections,new Set(['a'])),true);});
test('next sibling remains visible',()=>assert.equal(hiddenByHeading(60,sections,new Set(['a'])),false));
test('root folding leaves next document root visible',()=>{assert.equal(hiddenByHeading(70,sections,new Set(['root'])),true);assert.equal(hiddenByHeading(80,sections,new Set(['root'])),false);});
test('navigation reveals only containing sections',()=>assert.deepEqual([...revealHeadings(50,sections,new Set(['root','a','detail','b']))],['b']));
test('revealing a heading retains its own fold state',()=>assert.deepEqual([...revealHeadings(40,sections,new Set(['a','detail']))],['detail']));
test('active heading tracks the latest preceding heading',()=>{assert.equal(activeHeading(35,sections),'a');assert.equal(activeHeading(95,sections),'next');assert.equal(activeHeading(-1,sections),null);});
test('no headings is a valid document',()=>assert.deepEqual(headingSections(blocks.filter(b=>b.type==='paragraph'),100),[]));
test('reordered headings recalculate ranges rather than reusing positions',()=>{const moved=headingSections([{...blocks[6],pos:0},{...blocks[2],pos:10}],20);assert.equal(moved[0].end,10);assert.equal(moved[1].end,20);});
test('view preferences are safe when storage is malformed',()=>{for(const v of [null,[],42,'bad',{}])assert.deepEqual(parseView(v),defaultView);});
test('view size is bounded and rounded',()=>{assert.equal(parseView({size:1000}).size,22);assert.equal(parseView({size:-20}).size,14);assert.equal(parseView({size:17.8}).size,18);assert.equal(parseView({size:NaN}).size,16);});
test('invalid preference enum values cannot reach CSS selectors',()=>assert.deepEqual(parseView({font:'script',width:'infinite',mode:'admin',theme:'unsafe',focus:'yes'}),defaultView));
test('valid read preferences survive reload',()=>{const p={mode:'read',width:'wide',font:'serif',size:18,focus:true,theme:'dark'};assert.deepEqual(parseView(p),p);});
test('table dimensions are bounded',()=>{assert.deepEqual(tableDimensions(-5,300),{rows:1,columns:20});assert.deepEqual(tableDimensions(NaN,Infinity),{rows:3,columns:3});});
test('custom tables contain the requested rows and cells',()=>{const t=blankBlock('table',2,4);assert.equal(t.content.length,2);assert.equal(t.content[0].content.length,4);assert.equal(t.content[0].content[0].type,'tableHeader');assert.equal(t.content[1].content[0].type,'tableCell');});
test('table draft contains safe paragraphs in every cell',()=>{const t=blankBlock('table',3,2);for(const row of t.content)for(const cell of row.content)assert.deepEqual(cell.content,[{type:'paragraph'}]);});
test('heading drafts constrain the level',()=>{assert.equal(blankBlock('h2').attrs.level,2);assert.equal(blankBlock('h9'),null);});
test('task draft keeps the native task schema',()=>assert.deepEqual(blankBlock('task').content[0],{type:'taskItem',attrs:{checked:false},content:[{type:'paragraph'}]}));
test('columns contain independent editable paragraphs',()=>{const c=blankBlock('columns');assert.equal(c.content.length,2);assert.notEqual(c.content[0].content[0],c.content[1].content[0]);});
test('blank blocks do not import previous text or comment identities',()=>{for(const id of ['paragraph','h1','quote','code','bullet','task','columns'])assert.equal(JSON.stringify(blankBlock(id)).includes('blockId'),false);});
test('unknown inserts are refused',()=>assert.equal(blankBlock('javascript'),null));
test('images use the bundled sample rather than an external request',()=>assert.equal(blankBlock('image').attrs.src,'/editor-sample.svg'));
test('a caret inside a folded heading title does not expand its body',()=>assert.deepEqual([...revealHeadings(25,sections,new Set(['a']))],['a']));
test('a caret entering folded body content reveals it',()=>assert.deepEqual([...revealHeadings(31,sections,new Set(['a']))],[]));
test('moving a folded heading includes its full section',()=>assert.equal(foldedSpanEnd(20,10,sections,new Set(['a'])),60));
test('moving a normal heading moves only that block',()=>assert.equal(foldedSpanEnd(20,10,sections,new Set()),30));
test('moving the last folded section includes all trailing content',()=>assert.equal(foldedSpanEnd(80,10,sections,new Set(['next'])),100));
