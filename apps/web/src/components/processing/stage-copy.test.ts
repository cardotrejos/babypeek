import { describe, it, expect } from "vitest";
import { getUiStage, getStageCopy, stageMapping, stageCopy } from "./stage-copy";

describe("stage-copy utilities", () => {
  describe("stageMapping", () => {
    it("maps validating to analyzing stage (step 1)", () => {
      expect(stageMapping.validating).toEqual({ ui: "analyzing", step: 1 });
    });

    it("maps generating to creating stage (step 2)", () => {
      expect(stageMapping.generating).toEqual({ ui: "creating", step: 2 });
    });

    it("maps storing to finishing stage (step 3)", () => {
      expect(stageMapping.storing).toEqual({ ui: "finishing", step: 3 });
    });

    it("maps watermarking to finishing stage (step 3)", () => {
      expect(stageMapping.watermarking).toEqual({ ui: "finishing", step: 3 });
    });

    it("maps complete to finishing stage (step 3)", () => {
      expect(stageMapping.complete).toEqual({ ui: "finishing", step: 3 });
    });
  });

  describe("getUiStage", () => {
    it("returns correct stage info for validating", () => {
      expect(getUiStage("validating")).toEqual({ ui: "analyzing", step: 1 });
    });

    it("returns correct stage info for generating", () => {
      expect(getUiStage("generating")).toEqual({ ui: "creating", step: 2 });
    });

    it("returns correct stage info for storing", () => {
      expect(getUiStage("storing")).toEqual({ ui: "finishing", step: 3 });
    });

    it("returns correct stage info for watermarking", () => {
      expect(getUiStage("watermarking")).toEqual({ ui: "finishing", step: 3 });
    });

    it("returns correct stage info for complete", () => {
      expect(getUiStage("complete")).toEqual({ ui: "finishing", step: 3 });
    });

    it("defaults to analyzing for null stage", () => {
      expect(getUiStage(null)).toEqual({ ui: "analyzing", step: 1 });
    });

    it("defaults to analyzing for failed stage", () => {
      expect(getUiStage("failed")).toEqual({ ui: "analyzing", step: 1 });
    });
  });

  describe("stageCopy", () => {
    it("has copy for analyzing stage", () => {
      expect(stageCopy.analyzing.main).toBe("Analyzing your ultrasound...");
      expect(stageCopy.analyzing.sub).toContain("Finding your baby's unique features");
    });

    it("has copy for creating stage", () => {
      expect(stageCopy.creating.main).toBe("Creating your baby's portrait...");
      expect(stageCopy.creating.sub).toContain("Our AI is working its magic");
    });

    it("has copy for finishing stage", () => {
      expect(stageCopy.finishing.main).toBe("Adding final touches...");
      expect(stageCopy.finishing.sub).toContain("Making it perfect");
    });
  });

  describe("getStageCopy", () => {
    it("returns analyzing copy", () => {
      const copy = getStageCopy("analyzing");
      expect(copy.main).toBe("Analyzing your ultrasound...");
      expect(copy.sub.length).toBeGreaterThan(0);
    });

    it("returns creating copy", () => {
      const copy = getStageCopy("creating");
      expect(copy.main).toBe("Creating your baby's portrait...");
      expect(copy.sub.length).toBeGreaterThan(0);
    });

    it("returns finishing copy", () => {
      const copy = getStageCopy("finishing");
      expect(copy.main).toBe("Adding final touches...");
      expect(copy.sub.length).toBeGreaterThan(0);
    });
  });
});
