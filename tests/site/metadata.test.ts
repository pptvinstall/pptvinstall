import assert from "node:assert/strict";
import { test } from "node:test";
import { getPageMetadata } from "../../client/src/lib/page-metadata.ts";

test("public routes have distinct titles and canonical paths", () => {
  const titles = new Set<string>();
  for (const route of ["/", "/services", "/quote", "/booking", "/gallery", "/contact", "/faq", "/partners"]) {
    const metadata = getPageMetadata(route);
    assert.equal(metadata.canonical, "https://pptvinstall.com" + route);
    assert.equal(metadata.robots, "index, follow");
    titles.add(metadata.title);
  }
  assert.equal(titles.size, 8);
});
test("tracking and query values are excluded from canonicals", () => {
  assert.equal(getPageMetadata("/booking?email=private@example.com#details").canonical, "https://pptvinstall.com/booking");
});
test("owner, payment, customer quote and unknown pages are not indexable", () => {
  for (const route of ["/admin", "/admin/jobs", "/dashboard", "/q/private-token", "/payment/success", "/confirmation", "/unknown"]) {
    const metadata = getPageMetadata(route);
    assert.equal(metadata.robots, "noindex, nofollow");
    assert.equal(metadata.canonical, null);
    assert.ok(!JSON.stringify(metadata).includes("private-token"));
  }
});
test("known city pages retain local metadata", () => {
  const metadata = getPageMetadata("/areas/decatur", { name: "Decatur", county: "DeKalb County", slug: "decatur" });
  assert.match(metadata.title, /Decatur/);
  assert.equal(metadata.canonical, "https://pptvinstall.com/areas/decatur");
  assert.equal(metadata.robots, "index, follow");
});
