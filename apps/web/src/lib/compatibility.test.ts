import assert from "node:assert/strict";
import test from "node:test";
import { compatibilityScore, mbtiAffinity } from "./compatibility.ts";
import { demoViewer, sampleProfiles } from "./sample-data.ts";

test("golden MBTI pair scores higher than unrelated pair", () => {
  assert.ok(mbtiAffinity("INFP", "ENFJ") > mbtiAffinity("INFP", "ESTP"));
});

test("compatibility score is bounded", () => {
  for (const profile of sampleProfiles) {
    const score = compatibilityScore(demoViewer, profile);
    assert.ok(score >= 0 && score <= 100);
  }
});

