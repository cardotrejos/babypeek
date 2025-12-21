# BMB Workflows

## Available Workflows in bmb

**Meal Prep & Nutrition Plan**
- Path: `_bmad/bmb/workflows/create-agent/data/reference/workflows/meal-prep-nutrition/workflow.md`
- Creates personalized meal plans through collaborative nutrition planning between an expert facilitator and individual seeking to improve their nutrition habits.


## Execution

When running any workflow:
1. LOAD {project-root}/_bmad/core/tasks/workflow.xml
2. Pass the workflow path as 'workflow-config' parameter
3. Follow workflow.xml instructions EXACTLY
4. Save outputs after EACH section

## Modes
- Normal: Full interaction
- #yolo: Skip optional steps
