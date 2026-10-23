import test from "node:test";
import assert from "node:assert/strict";
import { aspectCrop, FULL_CROP, normalizeCrop, pixelCrop } from "../src/features/cropGeometry.ts";
import { DOCUMENT_TEMPLATES, searchTemplates } from "../src/features/templates.ts";
import { actionsFor, filterInserts, kindFor } from "../src/logic.ts";
import { blankBlock, tableDimensions } from "../src/blockCatalog.ts";

test("crop normalization handles invalid numbers", () => assert.deepEqual(normalizeCrop({ x: NaN, y: Infinity, width: NaN, height: Infinity }), FULL_CROP));
test("crop stays within the source image", () => assert.deepEqual(normalizeCrop({ x: 95, y: -10, width: 25, height: 125 }), { x: 75, y: 0, width: 25, height: 100 }));
test("crop has a minimum nonempty area", () => assert.deepEqual(normalizeCrop({ x: 0, y: 0, width: -1, height: 0 }), { x: 0, y: 0, width: 0.1, height: 0.1 }));
test("square preset on landscape has a centered crop", () => assert.deepEqual(aspectCrop(200, 100, 1), { x: 25, y: 0, width: 50, height: 100 }));
test("square preset on portrait has a centered crop", () => assert.deepEqual(aspectCrop(100, 200, 1), { x: 0, y: 25, width: 100, height: 50 }));
test("invalid aspect dimensions return full image", () => assert.deepEqual(aspectCrop(0, 200, 1), FULL_CROP));
test("crop pixels are integers and in bounds", () => assert.deepEqual(pixelCrop({ x: 25, y: 10, width: 50, height: 50 }, 200, 100), { x: 50, y: 10, width: 100, height: 50 }));
test("full crop is lossless geometrically", () => assert.deepEqual(pixelCrop(FULL_CROP, 123, 456), { x: 0, y: 0, width: 123, height: 456 }));
test("pixel crop refuses unavailable dimensions", () => assert.throws(() => pixelCrop(FULL_CROP, 0, 0), /dimensions/));
test("random normalized crops stay in bounds", () => {
  for (let index = 0; index < 100; index++) {
    const crop = normalizeCrop({ x: index * 7 - 90, y: index * 2 - 40, width: index - 15, height: 160 - index });
    assert.ok(crop.x >= 0 && crop.y >= 0 && crop.x + crop.width <= 100 && crop.y + crop.height <= 100);
  }
});
test("template ids are unique", () => assert.equal(new Set(DOCUMENT_TEMPLATES.map(t => t.id)).size, DOCUMENT_TEMPLATES.length));
test("template search ignores case", () => assert.deepEqual(searchTemplates("MEETING").map(t => t.id), ["meeting"]));
test("template category filters independently", () => assert.equal(searchTemplates("", "Planning").length, 2));
test("empty template results are explicit", () => assert.deepEqual(searchTemplates("nothing-like-this"), []));
test("templates never reuse block identities or thread marks", () => {
  for (const template of DOCUMENT_TEMPLATES) {
    const serialized = JSON.stringify(template.content);
    assert.ok(!serialized.includes("blockId") && !serialized.includes("commentId"));
  }
});
test("templates contain structurally complete lists and columns", () => {
  const visit = node => {
    if (["listItem", "taskItem", "column", "callout", "toggleBlock"].includes(node.type)) assert.ok(node.content.length > 0);
    if (node.type === "columns") assert.equal(node.content.length, 2);
    if (node.type === "table") assert.ok(node.content.every(row => row.content.length === node.content[0].content.length));
    node.content?.forEach(visit);
  };
  DOCUMENT_TEMPLATES.forEach(template => template.content.forEach(visit));
});
test("toggle and page break are discoverable via slash search", () => {
  assert.deepEqual(filterInserts("toggle").map(item => item.id), ["toggle"]);
  assert.deepEqual(filterInserts("page break").map(item => item.id), ["page-break"]);
});
test("new node kinds keep distinct context menus", () => {
  assert.equal(kindFor("toggleBlock"), "toggleBlock"); assert.equal(kindFor("pageBreak"), "pageBreak");
  assert.ok(!actionsFor("pageBreak").some(item => item.id === "comment"));
  assert.ok(actionsFor("image").some(item => item.id === "image-preview"));
});
test("all new menus have unique actions", () => {
  for (const kind of ["image", "toggleBlock", "pageBreak"]) {
    const ids = actionsFor(kind).map(item => item.id); assert.equal(new Set(ids).size, ids.length);
  }
});

test("aspect presets reject non-finite dimensions", () => assert.deepEqual(aspectCrop(Infinity, 100, 1), FULL_CROP));
test("square preset keeps aspect on wide panoramas", () => assert.equal(aspectCrop(10000, 100, 1).width, 1));


test("new blocks also exist in the workspace insert palette", () => {
  assert.equal(blankBlock("toggle").type, "toggleBlock");
  assert.equal(blankBlock("page-break").type, "pageBreak");
  assert.equal(blankBlock("toggle").content[0].type, "paragraph");
});
test("palette table sizing remains bounded after integration", () => {
  assert.deepEqual(tableDimensions(3.7, 300), {rows:3, columns:20});
  assert.deepEqual(tableDimensions(NaN, -2), {rows:3, columns:1});
});
test("unknown insertion commands cannot create arbitrary nodes", () => assert.equal(blankBlock("script"), null));
