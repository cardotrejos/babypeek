import type { ProcessingStage } from "@/hooks/use-status";

/**
 * Stage-specific copy for the processing screen.
 * Each stage has main copy and rotating sub-copy.
 */

export type UiStage = "analyzing" | "creating" | "finishing";

export interface StageCopyData {
  main: string;
  sub: string[];
}

export const stageCopy: Record<UiStage, StageCopyData> = {
  analyzing: {
    main: "Analyzing your ultrasound...",
    sub: ["Finding your baby's unique features", "Scanning for details", "Understanding the image"],
  },
  creating: {
    main: "Creating your baby's portrait...",
    sub: ["Our AI is working its magic", "Bringing your baby to life", "Almost there..."],
  },
  finishing: {
    main: "Adding final touches...",
    sub: ["Making it perfect", "Just a few more seconds", "Polishing the details"],
  },
};

export interface StageInfo {
  ui: UiStage;
  step: number;
}

/**
 * Map backend processing stages to UI stages
 */
export const stageMapping: Record<string, StageInfo> = {
  validating: { ui: "analyzing", step: 1 },
  generating: { ui: "creating", step: 2 },
  first_ready: { ui: "finishing", step: 3 },
  storing: { ui: "finishing", step: 3 },
  watermarking: { ui: "finishing", step: 3 },
  complete: { ui: "finishing", step: 3 },
};

/**
 * Get UI stage info from backend stage
 */
export function getUiStage(backendStage: ProcessingStage): StageInfo {
  if (!backendStage || backendStage === "failed") {
    return { ui: "analyzing", step: 1 };
  }
  return stageMapping[backendStage] ?? { ui: "analyzing", step: 1 };
}

/**
 * Get stage copy data for a UI stage
 */
export function getStageCopy(uiStage: UiStage): StageCopyData {
  return stageCopy[uiStage];
}
