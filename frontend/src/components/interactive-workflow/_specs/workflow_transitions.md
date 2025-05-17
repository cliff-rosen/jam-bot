# Workflow Transitions Specification

## Overview

This document specifies how different components of the system change during workflow transitions. Each step in a workflow affects multiple components simultaneously, ensuring a consistent and synchronized user experience.

## Journey Lifecycle States

1. **AWAITING_JOURNEY**
   - Initial state when user first engages
   - Only state where bot can propose new journey cards
   - Transitions to AWAITING_WORKFLOW_DESIGN when journey accepted

2. **AWAITING_WORKFLOW_DESIGN**
   - Entered after journey card acceptance
   - Bot can propose workflow designs
   - Transitions to AWAITING_WORKFLOW_START when workflow accepted

3. **AWAITING_WORKFLOW_START**
   - Workflow is accepted but execution hasn't begun
   - User can review workflow before starting
   - Transitions to WORKFLOW_IN_PROGRESS on first step activation

4. **WORKFLOW_IN_PROGRESS**
   - Active workflow execution state
   - Steps are being executed sequentially
   - Transitions to WORKFLOW_COMPLETE when all steps finished

5. **WORKFLOW_COMPLETE**
   - All workflow steps have been completed
   - All outputs have been accepted and moved to assets
   - Final state of the journey

## Key Components

1. **Journey Card**
   - Represents the overall progress and status
   - States: DRAFT → ACTIVE → COMPLETED/FAILED
   - Updates status, progress, and timestamps

2. **Chat**
   - Records user-copilot interactions
   - Provides context and confirmations
   - Shows tool status and results

3. **Workflow Overview**
   - Displays current workflow state
   - Shows step progression
   - Indicates active/completed steps

4. **Current Task**
   - Shows active step details
   - Displays tool status
   - Presents input/output panels
   - Temporary holding area for step outputs before acceptance
   - Contains Accept button for approving outputs

5. **Assets**
   - Stores approved workflow results
   - Only receives outputs after user acceptance
   - Maintains versions
   - Links to relevant resources

## System Rules

### Journey and Workflow Rules
1. Bot will only propose a journey card if status is AWAITING_JOURNEY
2. Bot will only propose workflow designs if status is AWAITING_WORKFLOW_DESIGN
4. Each state transition must be triggered by explicit user action
5. Journey card status must reflect current lifecycle state

### Step Execution Rules
1. Only one step can be active at a time
2. Steps must be completed in sequence unless jump conditions met
3. Step outputs appear in Current Task area first
4. Outputs must be accepted by user before moving to Assets
5. Step is not complete until outputs are accepted
6. Next step cannot start until current step is complete

### Asset Management Rules
1. Assets are only created after explicit user acceptance
2. Assets cannot be modified once accepted
3. Each asset must be linked to its originating step
4. Assets maintain version history if modified
5. Assets are preserved even if workflow fails

### Chat Interaction Rules
1. Every state change must have corresponding chat message
2. Chat must confirm all user actions
3. Chat must provide clear next steps
4. Chat cannot propose actions invalid for current state
5. Chat must maintain context of current task

## Example Workflow: Document Analysis Task

The following table demonstrates component states during a typical workflow:

| Step | Action | Description | Journey Card | Chat | Workflow Overview | Current Task | Assets |
|------|---------|-------------|--------------|------|-------------------|--------------|---------|
| Journey Creation | Initiating a New Journey | User requests in chat to create a new journey. Chat displays a response referring user to Journey Card proposal in Current Task area | Proposed card appears | User: "I need help analyzing these documents." Copilot: "I'll help you analyze those documents. I've created a journey card proposal for you to review." | Empty | Instructions to accept or reject journey card | Empty |
| Journey Acceptance | Journey Acceptance | User accepts the journey by clicking Accept button. The accepted journey card moves to the top. | Journey card becomes active | Copilot: "Great! I'll help you analyze those documents. Let's get started." | Empty | Empty | Empty |
| Workflow Proposal | Workflow Preselect Offer | Chat offers preselect options to propose a workflow. User selects "propose workflow". | Journey card status updates to DESIGNING WORKFLOW | Copilot: "Would you like me to propose a workflow for document analysis?" User: "Yes, propose workflow" | Still empty | Empty | Empty |
| Workflow Proposal Window | Workflow Proposal | Workflow proposal window appears, detailing steps and tools | Status changes to WORKFLOW PROPOSED | Copilot: "Here's a workflow I recommend for document analysis. It includes steps for scanning, categorizing, and summarizing the documents." | Workflow panel populated with proposed steps | "Does this workflow look good?" | Empty |
| Workflow Acceptance | Workflow Acceptance | User accepts the workflow. The workflow appears in the workflow area. | Status changes to WORKFLOW ACCEPTED | Copilot: "Great, let's begin with Step 1." | Workflow steps now visible, Step 1 active | Step 1 title and tool description shown | Empty |
| Step Execution | Tool Preparation | Chat prepares the tool for Step 1. | No change | Copilot: "I'll prepare the Document Scanner tool." | Step 1 marked "Preparing..." | Tool described in context | Empty |
| Tool Readiness | Tool Ready | Chat indicates the tool is ready, providing preselect options. | No change | Copilot: "Document Scanner is ready. Please select the documents to analyze." | Step 1 now ready | Input method active | Empty |
| Tool Activation | Tool Running | User accepts to continue. Tool status changes to "active". | No change | Copilot: "Running the Document Scanner now..." | Step 1 marked "Running..." | Loading state shown | Empty |
| Tool Completion | Results Ready | Tool completes task. Step updates with output. | No change | Copilot: "I've analyzed 15 documents. Here are the results." | Step 1 marked "Processing..." | Results shown in result panel with Accept button | Empty |
| Output Acceptance | Accept Results | User reviews and accepts the output by clicking Accept button in Current Task area. | No change | Copilot: "Great! I've saved the analysis results. Moving on to Step 2." | Step 1 marked complete, Step 2 now active | Empty (cleared after acceptance) | Scanned documents added to assets |

## Notes

- Each transition maintains data consistency across all components
- User actions trigger synchronized updates
- System provides clear feedback at each step
- Step outputs must be accepted in Current Task before moving to Assets
- Progress is clearly visible in all components
- State transitions are strictly controlled and validated 