Agent Architecture

Core Concept:
- For any given state of the mission, there is a single primary agent (supervisor) that handles all new requests
- Each supervisor has access to both phase-specific tools and general tools (web search, asset search/management)

Mission States and Supervisors:
1. No Mission Defined
   - Supervisor: Mission Definition Agent
   - Primary focus: Identify and develop mission object
   - Tools: Mission definition tools, general search

2. Mission Active, Workflow Pending/Completed
   - Supervisor: Workflow Planning Agent
   - Primary focus: Identify next steps and create workflows
   - Tools: Workflow planning tools, asset management

3. Mission Active, Workflow Active
   - Supervisor: Workflow Execution Agent
   - Primary focus: Execute current workflow, handle blockers
   - Tools: Execution tools, asset management

4. Mission Completed
   - Supervisor: Delivery Agent
   - Primary focus: Support inquiry of deliverables
   - Tools: Documentation tools, asset retrieval

Message Flow:
1. User sends new message
2. System routes message to appropriate supervisor based on current state
3. Supervisor either:
   - Answers directly
   - Delegates to appropriate tool
4. If delegated to tool:
   - Tool executes
   - Updates conversation
   - Returns control to supervisor
5. Repeat steps 3-4 until final answer

Key Benefits:
- Clear state-based routing
- Each supervisor has focused responsibilities
- Simple, predictable flow
- Easy to maintain and extend

    

