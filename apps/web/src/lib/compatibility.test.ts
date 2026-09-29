import assert from "node:assert/strict";
import test from "node:test";
import { compatibilityReasons, compatibilityScore, mbtiAffinity } from "./compatibility.ts";
import { demoViewer, sampleProfiles } from "./sample-data.ts";

test("shared communication preferences score above fewer shared preferences", () => {
  assert.ok(mbtiAffinity("INFP", "ENFJ") > mbtiAffinity("INFP", "ESTP"));
});

test("compatibility score is bounded", () => {
  for (const profile of sampleProfiles) {
    const score = compatibilityScore(demoViewer, profile);
    assert.ok(score >= 0 && score <= 100);
  }
});

test("MBTI preference heuristic is symmetric and explains conversation fit", () => {
  for (const a of ["INFP", "ENFJ", "ESTP", "ISTJ"]) {
    for (const b of ["INFP", "ENFJ", "ESTP", "ISTJ"]) {
      assert.equal(mbtiAffinity(a, b), mbtiAffinity(b, a));
      assert.ok(mbtiAffinity(a, b) >= 0 && mbtiAffinity(a, b) <= 1);
    }
  }
  const reasons = compatibilityReasons(demoViewer, sampleProfiles[0]);
  assert.ok(reasons.length >= 2);
  assert.ok(reasons.every((reason) => reason.length > 10));
});
