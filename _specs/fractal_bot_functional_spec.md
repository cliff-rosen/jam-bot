# Fractal Bot: Collaborative Problem-Solving System

## Overview

The Fractal Bot system enables deep collaboration between users and an AI assistant to solve complex questions through a pipeline-oriented approach to workflow development and execution.

The system consists of four key entities that work together:

1. **User**: The human operator who:
   - Poses questions and tasks
   - Reviews and approves steps
   - Can intervene at any point
   - Has direct access to all assets
   - Maintains control of the workflow

2. **Chatbot**: An AI assistant that:
   - Helps plan and structure the approach
   - Guides the user through the process
   - Provides "agent assistance":
      - Suggests appropriate agents
      - Facilitates invocation of agents
      - Reports on agent progress
   - Provides explanations and insights
   - Works as a copilot rather than an autonomous agent
   - Has ability to directly generate assets when an specialized agent is not required (ie for basic document drafting)

3. **Assets**: A shared workspace that:
   - Contains all information and data
   - Is accessible to all entities
   - Represents the current state
   - Tracks progress and results
   - Serves as the communication medium

4. **Agents**: Specialized workers that:
   - Execute specific tasks
   - Read from and write to assets
   - Report their status
   - Operate under user/bot guidance
   - Can be run locally or in the cloud - ie through MCP

As where in traditional systems the user accesses a chatbot that chooses and uses tools on its own, with FractalBot, the user is choosing and using tools with the help of an AI copilot.

## Core Concepts

1. **Fundamental Architecture**
   - System enables human-AI collaboration through shared assets
   - User and AI copilot work together to:
     - Plan and structure approaches
     - Choose and use appropriate tools
     - Build and refine solutions
   - All information is captured in shared assets that:
     - Serve as the communication medium
     - Represent the current state
     - Track progress and results
     - Are accessible to all participants
   - Unlike traditional AI systems that:
     - Act autonomously with tools
     - Keep information internal
     - Make decisions independently
   - Fractal Bot:
     - Works as a copilot with the user
     - Makes all information visible and shared
     - Requires user approval for actions
     - Maintains transparency throughout
                       
2. **Collaborative Chat Interface**
   - Primary interaction point between user and AI copilot
   - Natural conversation to:
     - Develop and refine approaches
     - Choose appropriate tools
     - Plan execution steps
   - Bot provides guidance while user maintains control
   - Real-time feedback and clarification
   - Support for action buttons to trigger specific workflows
   - Message history with timestamps and role indicators
   - Clear decision points between major workflow steps
   - User approval required for workflow progression
   - User can intervene at any point to:
     - Add new information or files
     - Revise the original question
     - Request additional checks or analysis
     - Redirect the workflow
     - Provide feedback on intermediate results

3. **Specialized Agent System**
   - Tools that the user and AI copilot can choose to use
   - Each agent is a specialized worker with a specific task
   - Agents are launched in sequence to build up information
   - Agent categories include:
     - Data Collection (e.g., Song List Agent)
     - Information Retrieval (e.g., Lyrics Retrieval Agent)
     - Analysis and Processing (e.g., Analysis Agent)
   - Each agent:
     - Has a clear, single responsibility
     - Produces output for the next agent
     - Reports its status and progress
     - Can be monitored and managed
     - Takes input from shared assets
     - Produces output as new assets
     - Operates under user/bot guidance

4. **Visual Workspace**
   - Three-column layout that emphasizes shared information:
     - Left Column: Chat Interface
       - Real-time conversation with the AI assistant
       - Message history display
       - Input area for new messages
       - Action buttons for workflow progression
     - Middle Column: Assets Panel (Shared Project Folder)
       - Display of all information assets
       - File upload capabilities
       - Asset organization and management
       - Asset metadata display
       - Accessible to all collaborators:
         - User
         - Bot
         - Active agents
       - Represents current workflow state
       - Final state contains solution
     - Right Column: Agents Panel
       - Display of available and active tools
       - Agent status and progress
       - Agent selection interface
   - Modern UI with dark/light mode support
   - Responsive layout with proper spacing and borders
   - Backdrop blur effects for depth
   - Glass-morphism design elements

5. **User Experience Transitions**

   | State Change | Chat Interface | Assets Panel | Agents Panel |
   |-------------|----------------|--------------|--------------|
   | **Agent Launch Proposal** | • New message from chatbot proposing agent launch<br>• Action button appears for user approval<br>• Shows expected outcomes | • New asset appears<br>• Status: "Proposed"<br>• Shows expected output type<br>• Placeholder for future content | • Agent appears in "Current Agents" area<br>• Status: "Proposed"<br>• Shows agent description |
   | **Agent Launch** | • New message from chatbot confirming launch<br>• Action button disappears<br>• Shows progress indicators | • Asset status updates to "Pending"<br>• Shows expected output type | • Agent status updates to "In Progress"<br>• Progress indicators become active<br>• Shows estimated completion time |
   | **Agent Completion** | • New message from chatbot reporting completion<br>• Summary of results<br>• Proposal for next step<br>• New action buttons for next actions | • Asset status updates to "Ready"<br>• Content becomes available<br>• Metadata is populated<br>• Shows completion timestamp | • Agent status updates to "Completed"<br>• Agent moves to "Recently Used" section<br>• Shows completion time<br>• Re-run option becomes available |
   | **User Intervention** | • Action buttons for approval/rejection<br>• Input field for modifications<br>• Asset review controls<br>• Cancel/stop buttons | • Edit controls for user-owned assets<br>• Review/comment interface<br>• Version history view<br>• Status indicators update | • Cancel/stop controls for active agents<br>• Re-run option for completed agents<br>• Status indicators update<br>• Progress bars pause/resume |

6. **Asset Management**
   - Support for multiple asset types:
     - Text files
     - Spreadsheets
     - PDFs
     - General data
   - Asset metadata tracking:
     - Timestamp
     - File size
     - File type
     - Custom tags
     - Agent associations
     - Creator (user/bot/agent)
   - Asset operations:
     - Upload
     - Delete
     - View
     - Organize
     - Edit (by all collaborators)
   - Asset readiness states:
     - Processing
     - Ready
     - Error
   - Asset relationships between agents
   - Shared access and modification rights
   - Version tracking of changes

7. **Information Asset Building**
   - Each agent generates specific information
   - Information flows through the pipeline
   - Assets can include:
     - Collected data
     - Retrieved information
     - Analysis outputs
     - Intermediate results
     - User contributions
     - Bot insights
   - Progressive building of information
   - Asset linking to specific agents
   - Clear asset ownership and responsibility
   - Collaborative editing and review
   - Final state represents complete solution

## Example Flow

1. **Initial Setup**
   - User presents question or task
   - Bot analyzes requirements
   - Bot proposes sequence of specialized agents
   - User confirms or modifies plan
   - System prepares first agent
   - Initial assets are created

2. **Workflow Execution**
   - Bot launches first specialized agent
   - Agent performs its specific task
   - Results are captured as assets
   - User reviews and approves
   - User can intervene to:
     - Add new information
     - Modify direction
     - Request additional analysis
   - Next agent is launched
   - Process continues until completion

3. **Review and Refinement**
   - Results are presented to user
   - User can request modifications
   - Bot can suggest next steps
   - Process continues until satisfied
   - Workflow is documented
   - Final assets represent solution

## Key Benefits

1. **Clear Task Specialization**
   - Each agent has a specific role
   - Clear progression of tasks
   - Predictable workflow
   - Easy to understand and follow

2. **User Control**
   - Clear decision points
   - Explicit approval required
   - Easy to modify approach
   - Transparent progress
   - Intervention at any point
   - Direct asset manipulation

3. **Information Organization**
   - Clear tracking of progress
   - Easy access to all generated assets
   - Building blocks for solution
   - Asset-agent relationships
   - Shared project workspace
   - Collaborative editing

4. **Agent Integration**
   - Specialized agents for specific tasks
   - Sequential workflow
   - Clear input/output relationships
   - Status tracking and monitoring
   - Asset-based communication
   - Result-driven execution
