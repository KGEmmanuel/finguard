import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalJson } from "../src/canonical.js";

test("sorts object keys lexicographically at every depth", () => {
  const out = canonicalJson({ b: 1, a: { z: true, m: null } });
  assert.equal(out, '{"a":{"m":null,"z":true},"b":1}');
});

test("no insignificant whitespace", () => {
  assert.ok(!canonicalJson({ a: [1, 2, { c: "x" }] }).includes(" "));
});

test("arrays keep caller order", () => {
  assert.equal(canonicalJson([3, 1, 2]), "[3,1,2]");
});

test("key order in input does not change output", () => {
  const a = canonicalJson({ x: 1, y: 2 });
  const b = canonicalJson({ y: 2, x: 1 });
  assert.equal(a, b);
});

test("rejects non-finite numbers", () => {
  assert.throws(() => canonicalJson({ a: Infinity }));
});

test("escapes strings per JSON", () => {
  assert.equal(canonicalJson({ "a\"b": "c\nd" }), '{"a\\"b":"c\\nd"}');
});
