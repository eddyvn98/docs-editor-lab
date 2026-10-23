import test from "node:test";
import assert from "node:assert/strict";
import {findMatches,isDocument,safeFileName} from "../src/documentUtils.ts";
test("find returns proper ProseMirror positions",()=>{
  const doc={descendants(fn){fn({isText:true,text:"Alpha alpha"},7);fn({isText:true,text:"Beta Alpha"},30);}};
  assert.deepEqual(findMatches(doc,"ALPHA"),[{from:7,to:12},{from:13,to:18},{from:35,to:40}]);
});
test("empty query finds nothing",()=>{
  const doc={descendants(fn){fn({isText:true,text:"alpha"},4);}};
  assert.deepEqual(findMatches(doc," "),[]);
});
test("validate document JSON on import",()=>{
  assert.equal(isDocument({type:"doc",content:[]}),true);
  assert.equal(isDocument({type:"doc",content:"wrong"}),false);
  assert.equal(isDocument({type:"script"}),false);
});
test("filename is sanitized",()=>assert.equal(safeFileName("Safe & Focused / Document"),"Safe-Focused-Document"));
