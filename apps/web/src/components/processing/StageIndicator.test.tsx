import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StageIndicator } from "./StageIndicator";

describe("StageIndicator", () => {
  it("renders all three stages", () => {
    render(<StageIndicator currentStep={1} />);

    expect(screen.getByText("Analyzing")).toBeInTheDocument();
    expect(screen.getByText("Creating")).toBeInTheDocument();
    expect(screen.getByText("Finishing")).toBeInTheDocument();
  });

  it("highlights only the current stage at step 1", () => {
    const { container } = render(<StageIndicator currentStep={1} />);

    // Find stage elements - first one (Analyzing) should be active
    const stages = container.querySelectorAll(".rounded-full");
    const analyzingStage = stages[0];
    const creatingStage = stages[1];
    const finishingStage = stages[2];

    expect(analyzingStage).toHaveClass("bg-coral");
    expect(creatingStage).toHaveClass("bg-charcoal/5");
    expect(finishingStage).toHaveClass("bg-charcoal/5");
  });

  it("marks completed stages and highlights current at step 2", () => {
    const { container } = render(<StageIndicator currentStep={2} />);

    const stages = container.querySelectorAll(".rounded-full");
    const analyzingStage = stages[0];
    const creatingStage = stages[1];
    const finishingStage = stages[2];

    // Analyzing should be completed (coral/20), Creating active (coral), Finishing pending
    expect(analyzingStage).toHaveClass("bg-coral/20");
    expect(creatingStage).toHaveClass("bg-coral");
    expect(finishingStage).toHaveClass("bg-charcoal/5");
  });

  it("marks first two stages completed and highlights third at step 3", () => {
    const { container } = render(<StageIndicator currentStep={3} />);

    const stages = container.querySelectorAll(".rounded-full");
    const analyzingStage = stages[0];
    const creatingStage = stages[1];
    const finishingStage = stages[2];

    expect(analyzingStage).toHaveClass("bg-coral/20");
    expect(creatingStage).toHaveClass("bg-coral/20");
    expect(finishingStage).toHaveClass("bg-coral");
  });

  it("shows stage icons", () => {
    render(<StageIndicator currentStep={1} />);

    expect(screen.getByText("🔍")).toBeInTheDocument();
    expect(screen.getByText("✨")).toBeInTheDocument();
    expect(screen.getByText("🎨")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<StageIndicator currentStep={1} className="test-class" />);

    expect(container.firstChild).toHaveClass("test-class");
  });

  it("renders connector lines between stages", () => {
    const { container } = render(<StageIndicator currentStep={1} />);

    // Should have 2 connector lines (between 3 stages)
    const connectors = container.querySelectorAll(".h-0\\.5");
    expect(connectors).toHaveLength(2);
  });

  it("colors connectors based on completion", () => {
    const { container } = render(<StageIndicator currentStep={2} />);

    const connectors = container.querySelectorAll(".h-0\\.5");
    // First connector (between Analyzing and Creating) should be coral (completed)
    expect(connectors[0]).toHaveClass("bg-coral");
    // Second connector (between Creating and Finishing) should be dim
    expect(connectors[1]).toHaveClass("bg-charcoal/10");
  });
});
