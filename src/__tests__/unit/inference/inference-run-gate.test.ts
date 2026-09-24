import { describe, expect, it } from "vitest";
import { inferenceRunMayEnter } from "../../../inference/inference-run-gate.js";

describe("inferenceRunMayEnter", () => {
  it("enters when the inference key is missing", () => {
    expect(inferenceRunMayEnter(undefined, false)).toBe(true);
  });

  it("enters when inference is enabled", () => {
    expect(inferenceRunMayEnter({ enabled: true }, false)).toBe(true);
  });

  it("stays out when inference is explicitly off", () => {
    expect(inferenceRunMayEnter({ enabled: false }, false)).toBe(false);
  });

  it("enters on force when inference is explicitly off", () => {
    expect(inferenceRunMayEnter({ enabled: false }, true)).toBe(true);
  });
});
