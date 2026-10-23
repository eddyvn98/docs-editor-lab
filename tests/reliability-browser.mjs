// Optional local regression suite. It does not invoke GitHub Actions.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
const server = process.env.TEST_BASE_URL ? null : spawn(process.execPath,
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4174", "--strictPort"], { stdio: "inherit" });
const url = process.env.TEST_BASE_URL || "http://127.0.0.1:4174";
let browser;
async function waitForServer() {
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error("Local server did not start.");
}
try {
  await waitForServer(); browser = await chromium.launch({ headless: true });
  for (const width of [1365, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 860 } });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(url); await page.locator(".ProseMirror").waitFor();
    await page.getByRole("textbox", { name: "Document title", exact: true }).fill("Recovery and focus regression");
    await page.waitForFunction(() => JSON.parse(localStorage.getItem("docs-editor-lab-session-v2") || "{}").title === "Recovery and focus regression");
    await page.reload();
    assert.equal(await page.getByRole("textbox", { name: "Document title", exact: true }).inputValue(), "Recovery and focus regression");

    await page.locator(".ProseMirror > p").first().click();
    await page.keyboard.press("ControlOrMeta+k");
    await page.getByLabel("Link URL", { exact: true }).fill("javascript:alert(1)");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.locator(".detail-panel [role=alert]").waitFor();
    await page.getByLabel("Link URL", { exact: true }).fill("https://example.com/review");
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".detail-panel").count(), 0);
    assert.equal(await page.locator(".ProseMirror").evaluate(el => el === document.activeElement), true);

    await page.locator(".image-figure img").first().click();
    const caption = page.getByPlaceholder("Describe the image");
    await caption.fill("Draft survives scroll and resize");
    await page.evaluate(() => window.scrollBy(0, 90));
    await page.setViewportSize({ width: width === 390 ? 360 : 1200, height: 760 });
    assert.equal(await caption.inputValue(), "Draft survives scroll and resize");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    assert.equal(await page.locator(".image-figure figcaption").first().textContent(), "Draft survives scroll and resize");

    await page.locator(".ProseMirror > p").first().click({ clickCount: 3 });
    await page.getByRole("button", { name: "Comment", exact: true }).click();
    await page.getByPlaceholder("Leave a note on this block\u2026").fill("Review this text");
    await page.getByRole("button", { name: "Add comment", exact: true }).click();
    await page.getByRole("textbox", { name: "Reply to comment" }).fill("Reviewed locally");
    await page.getByRole("button", { name: "Reply", exact: true }).click();
    await page.getByText("Reviewed locally", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Delete comment", exact: true }).click();
    assert.equal(await page.locator(".ProseMirror [data-comment-id]").count(), 0);
    assert.deepEqual(errors, []);
    await context.close(); console.log(`PASS reliability interactions width=${width}`);
  }
  const blocked = await browser.newContext();
  const page = await blocked.newPage();
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException("Quota full", "QuotaExceededError"); }; });
  await page.goto(url); await page.locator(".ProseMirror").waitFor();
  await page.locator(".document-notice").getByText(/Not saved/).waitFor();
  assert.equal(await page.locator(".save-state").textContent(), "Not saved");
  await blocked.close(); console.log("PASS truthful storage failure state");
} finally { await browser?.close(); server?.kill("SIGTERM"); }
