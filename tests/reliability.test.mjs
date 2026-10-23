import test from "node:test";
import assert from "node:assert/strict";
import { safeLink, safeImage, clampImageWidth, escapeHTML } from "../src/safety.ts";
import { findMatches, safeFileName } from "../src/documentUtils.ts";
import { writeStorage, readStorage } from "../src/storage.ts";
import { slashQuery, actionsFor } from "../src/logic.ts";

const doc = nodes => ({ descendants: callback => nodes.forEach(([text, pos]) => callback({ isText: true, text }, pos)) });
function storage(value, run) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value });
  try { run(); } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete globalThis.localStorage;
  }
}
test("link accepts supported schemes and stable block anchors", () => {
  for (const url of ["https://example.com", "http://localhost:4173", "mailto:editor@example.com", "tel:+841234", "#block-abc-123"]) assert.equal(safeLink(url), url);
});
test("link rejects executable and ambiguous URLs", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,x", "file:///tmp/x", "//example.com", "java\nscript:alert(1)", "https://host/ bad", ""]) assert.equal(safeLink(url), null);
});
test("image allows only raster data URLs, local assets and HTTP(S)", () => {
  assert.equal(safeImage("data:image/png;base64,YQ=="), "data:image/png;base64,YQ==");
  assert.equal(safeImage("/editor-sample.svg"), "/editor-sample.svg");
  assert.equal(safeImage("https://host/image.png"), "https://host/image.png");
});
test("image rejects SVG data, protocol-relative paths and control chars", () => {
  for (const url of ["data:image/svg+xml;base64,YQ==", "javascript:x", "//host/x", "/\\evil/x", "https://host/x\ny"]) assert.equal(safeImage(url), null);
});
test("oversized raster data is rejected before insertion", () => assert.equal(safeImage("data:image/png;base64," + "A".repeat(2_100_001)), null));
test("image widths stay within the document", () => {
  assert.equal(clampImageWidth("200%"), "100%"); assert.equal(clampImageWidth(-20), "25%");
  assert.equal(clampImageWidth("70%"), "70%"); assert.equal(clampImageWidth("oops"), "100%");
});
test("export title is escaped", () => assert.equal(escapeHTML('<img x="a">&'), "&lt;img x=&quot;a&quot;&gt;&amp;"));
test("search spans adjacent text with different marks", () => assert.deepEqual(findMatches(doc([["bold", 1], [" text", 5]]), "bold text"), [{ from: 1, to: 10 }]));
test("search never crosses a block boundary", () => assert.deepEqual(findMatches(doc([["bold", 1], [" text", 7]]), "bold text"), []));
test("case folding does not corrupt UTF-16 positions", () => assert.deepEqual(findMatches(doc([["\u0130x", 7]]), "x"), [{ from: 8, to: 9 }]));
test("regular expression punctuation is treated literally", () => assert.deepEqual(findMatches(doc([["a.*[x]b", 3]]), ".*[x]"), [{ from: 4, to: 9 }]));
test("search produces non-overlapping ranges", () => assert.deepEqual(findMatches(doc([["aaaa", 1]]), "aa"), [{ from: 1, to: 3 }, { from: 3, to: 5 }]));
test("whitespace-only query produces no ranges", () => assert.deepEqual(findMatches(doc([["a b", 1]]), " "), []));
test("slash menu tolerates initial whitespace", () => assert.equal(slashQuery("  /heading"), "heading"));
test("slash query cannot start halfway through text", () => assert.equal(slashQuery("text /head"), null));
test("task blocks offer indent/outdent", () => assert.ok(actionsFor("taskList").some(item => item.id === "outdent")));
test("block actions include stable links and keyboard alternatives", () => {
  const ids = actionsFor("paragraph").map(item => item.id);
  for (const id of ["block-link", "move-up", "move-down"]) assert.ok(ids.includes(id));
});
test("storage quota errors are reported instead of a success message", () => storage({ setItem() { throw new Error("QuotaExceeded"); } }, () => assert.equal(writeStorage("doc", {}).ok, false)));
test("serialization errors are reported", () => {
  const cyclic = {}; cyclic.self = cyclic;
  storage({ setItem() {} }, () => assert.equal(writeStorage("doc", cyclic).ok, false));
});
test("successful save writes JSON", () => {
  let result; storage({ setItem(key, value) { result = [key, value]; } }, () => assert.equal(writeStorage("doc", { x: 1 }).ok, true));
  assert.deepEqual(result, ["doc", '{"x":1}']);
});
test("corrupt and invalid stored values use a validated fallback", () => {
  storage({ getItem() { return "{"; } }, () => assert.equal(readStorage("doc", "fallback", x => typeof x === "string"), "fallback"));
  storage({ getItem() { return "42"; } }, () => assert.equal(readStorage("doc", "fallback", x => typeof x === "string"), "fallback"));
});
test("file names never include path separators", () => assert.equal(safeFileName("Safe & Focused / Document"), "Safe-Focused-Document"));
