# Orchestrator

A powerful workflow automation tool that helps you orchestrate and execute complex workflows combining different tools and services.

## Overview

Orchestrator is a web-based platform that allows you to:
- Create and manage custom workflows
- Combine different tools like PubMed searches and LLM interactions
- Execute workflows with configurable parameters
- View and track workflow execution results

## How It Works

1. **Creating Workflows**
   - Create a new workflow from the web interface
   - Add steps to your workflow (e.g., PubMed searches, LLM interactions)
   - Configure step parameters and connections between steps

2. **Workflow Steps**
   - Each step can use different tools:
     - PubMed Search: Search medical literature
     - LLM Integration: Use language models with custom prompts
     - More tools can be added as needed

3. **Executing Workflows**
   - Run workflows with your specified inputs
   - View results from each step
   - Track workflow status and handle any errors

4. **Managing Workflows**
   - View all your workflows
   - Edit existing workflows
   - Delete workflows you no longer need

## Getting Started

1. Clone this repository
2. Run the setup script:
   ```bash
   ./setup_backend.sh
   ```
3. Start the backend and frontend servers
4. Navigate to the web interface
5. Create your first workflow!

For more detailed documentation, check out the `docs` directory.

