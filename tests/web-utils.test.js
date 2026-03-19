import test from "node:test";
import assert from "node:assert/strict";

import {
  escapeHtml,
  formatMoney,
  groupByCategory,
  isUpcomingEvent,
  stars
} from "../src/utils.js";

test("escapeHtml safely escapes reserved characters", () => {
  assert.equal(escapeHtml(`<div class="x">O'Hara & Co.</div>`), "&lt;div class=&quot;x&quot;&gt;O&#39;Hara &amp; Co.&lt;/div&gt;");
});

test("formatMoney renders USD currency", () => {
  assert.equal(formatMoney(4.5), "$4.50");
});

test("groupByCategory groups menu items by category", () => {
  const grouped = groupByCategory([
    { name: "Cherry", category: "Classic" },
    { name: "Rain", category: "Specialty" },
    { name: "Grape", category: "Classic" }
  ]);

  assert.deepEqual(Object.keys(grouped).sort(), ["Classic", "Specialty"]);
  assert.equal(grouped.Classic.length, 2);
});

test("isUpcomingEvent identifies future dates", () => {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  assert.equal(isUpcomingEvent(tomorrow), true);
  assert.equal(isUpcomingEvent(yesterday), false);
});

test("stars renders a five-character star string", () => {
  assert.equal(stars(3), "★★★☆☆");
});
