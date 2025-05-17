import React, { useState } from 'react';
import { Trash2, Plus, ChevronDown, ChevronRight, Settings, Wrench } from 'lucide-react';

// Step types
const STEP_TYPE = {
  ATOMIC: 'atomic',
  COMPOSITE: 'composite'
};

// Initial workflow with a single empty step
const initialWorkflow = {
  id: '1',
  name: 'New Workflow',
  steps: [
    {
      id: '1-1',
      type: STEP_TYPE.ATOMIC,
      name: 'Step 1',
      toolAssignment: ''
    }
  ]
};

// Available tools for atomic steps
const availableTools = [
  { id: 'tool1', name: 'Email Notification' },
  { id: 'tool2', name: 'Data Validation' },
  { id: 'tool3', name: 'API Request' },
  { id: 'tool4', name: 'Database Query' },
  { id: 'tool5', name: 'File Transformation' },
];

// Component for a single step (recursive for composite steps)
const Step = ({ step, depth = 0, onChange, onDelete, onAddChild }) => {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [stepName, setStepName] = useState(step.name);
  
  const handleTypeChange = (e) => {
    const newType = e.target.value;
    const updatedStep = { 
      ...step, 
      type: newType,
      // Add childSteps if changing to composite, add toolAssignment if atomic
      ...(newType === STEP_TYPE.COMPOSITE 
          ? { childSteps: [], toolAssignment: undefined } 
          : { childSteps: undefined, toolAssignment: '' })
    };
    onChange(updatedStep);
  };
  
  const handleToolChange = (e) => {
    onChange({ ...step, toolAssignment: e.target.value });
  };
  
  const handleNameSave = () => {
    onChange({ ...step, name: stepName });
    setEditing(false);
  };
  
  // Calculate the left margin based on depth
  const marginLeft = depth * 24;
  
  return (
    <div className="mb-4">
      <div 
        className="flex items-center p-3 bg-white border rounded-md shadow-sm hover:shadow-md transition-shadow"
        style={{ marginLeft: `${marginLeft}px` }}
      >
        {/* Expand/collapse for composite steps */}
        {step.type === STEP_TYPE.COMPOSITE && (
          <button 
            onClick={() => setExpanded(!expanded)}
            className="mr-2 text-gray-500 hover:text-gray-700"
          >
            {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        )}
        
        {/* Step icon */}
        <div className="mr-3 text-blue-500">
          {step.type === STEP_TYPE.ATOMIC ? 
            <Wrench size={20} /> : 
            <Settings size={20} />
          }
        </div>
        
        {/* Step name */}
        <div className="flex-grow">
          {editing ? (
            <div className="flex items-center">
              <input
                type="text"
                value={stepName}
                onChange={(e) => setStepName(e.target.value)}
                className="border rounded px-2 py-1 mr-2 flex-grow"
                autoFocus
              />
              <button 
                onClick={handleNameSave}
                className="px-2 py-1 bg-blue-500 text-white rounded text-sm"
              >
                Save
              </button>
            </div>
          ) : (
            <div 
              className="font-medium cursor-pointer"
              onClick={() => setEditing(true)}
            >
              {step.name}
            </div>
          )}
        </div>
        
        {/* Step type selector */}
        <select
          value={step.type}
          onChange={handleTypeChange}
          className="mr-3 p-2 border rounded bg-gray-50"
        >
          <option value={STEP_TYPE.ATOMIC}>Atomic</option>
          <option value={STEP_TYPE.COMPOSITE}>Composite</option>
        </select>
        
        {/* Tool assignment (for atomic steps) */}
        {step.type === STEP_TYPE.ATOMIC && (
          <select
            value={step.toolAssignment || ''}
            onChange={handleToolChange}
            className="mr-3 p-2 border rounded bg-gray-50"
          >
            <option value="" disabled>Select a tool</option>
            {availableTools.map(tool => (
              <option key={tool.id} value={tool.id}>
                {tool.name}
              </option>
            ))}
          </select>
        )}
        
        {/* Add child button (for composite steps) */}
        {step.type === STEP_TYPE.COMPOSITE && (
          <button
            onClick={() => onAddChild(step.id)}
            className="p-2 mr-2 text-green-600 hover:text-green-800 rounded-full hover:bg-green-50"
            title="Add child step"
          >
            <Plus size={18} />
          </button>
        )}
        
        {/* Delete button */}
        <button
          onClick={() => onDelete(step.id)}
          className="p-2 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50"
          title="Delete step"
        >
          <Trash2 size={18} />
        </button>
      </div>
      
      {/* Render child steps recursively */}
      {step.type === STEP_TYPE.COMPOSITE && expanded && step.childSteps && (
        <div className="ml-8">
          {step.childSteps.map(childStep => (
            <Step
              key={childStep.id}
              step={childStep}
              depth={depth + 1}
              onChange={(updatedChild) => {
                const updatedChildSteps = step.childSteps.map(cs => 
                  cs.id === updatedChild.id ? updatedChild : cs
                );
                onChange({ ...step, childSteps: updatedChildSteps });
              }}
              onDelete={(childId) => {
                const updatedChildSteps = step.childSteps.filter(cs => cs.id !== childId);
                onChange({ ...step, childSteps: updatedChildSteps });
              }}
              onAddChild={(parentId) => onAddChild(parentId)}
            />
          ))}
          
          {step.childSteps.length === 0 && (
            <div 
              className="p-3 mt-2 text-sm text-gray-500 italic border border-dashed rounded-md"
              style={{ marginLeft: `${marginLeft + 8}px` }}
            >
              No child steps yet. Click the + button to add a child step.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Main workflow builder component
const WorkflowBuilder = () => {
  const [workflow, setWorkflow] = useState(initialWorkflow);
  const [workflowName, setWorkflowName] = useState(initialWorkflow.name);
  const [editing, setEditing] = useState(false);
  
  // Generate a unique ID for new steps
  const generateStepId = (parentId = null) => {
    const baseId = parentId || workflow.id;
    const timestamp = new Date().getTime();
    return `${baseId}-${timestamp}`;
  };
  
  // Add a new step to the workflow
  const addStep = () => {
    const newStep = {
      id: generateStepId(),
      type: STEP_TYPE.ATOMIC,
      name: `Step ${workflow.steps.length + 1}`,
      toolAssignment: ''
    };
    
    setWorkflow({
      ...workflow,
      steps: [...workflow.steps, newStep]
    });
  };
  
  // Add a child step to a composite step
  const addChildStep = (parentId) => {
    // Helper function to recursively find and update the parent step
    const updateStepsWithNewChild = (steps) => {
      return steps.map(step => {
        if (step.id === parentId) {
          // Add child to this step
          const newChild = {
            id: generateStepId(parentId),
            type: STEP_TYPE.ATOMIC,
            name: `Child ${(step.childSteps?.length || 0) + 1}`,
            toolAssignment: ''
          };
          
          return {
            ...step,
            childSteps: [...(step.childSteps || []), newChild]
          };
        } else if (step.type === STEP_TYPE.COMPOSITE && step.childSteps) {
          // Look deeper into children
          return {
            ...step,
            childSteps: updateStepsWithNewChild(step.childSteps)
          };
        } else {
          return step;
        }
      });
    };
    
    setWorkflow({
      ...workflow,
      steps: updateStepsWithNewChild(workflow.steps)
    });
  };
  
  // Update a step in the workflow
  const updateStep = (updatedStep) => {
    // Helper function to recursively find and update the step
    const updateSteps = (steps) => {
      return steps.map(step => {
        if (step.id === updatedStep.id) {
          return updatedStep;
        } else if (step.type === STEP_TYPE.COMPOSITE && step.childSteps) {
          return {
            ...step,
            childSteps: updateSteps(step.childSteps)
          };
        } else {
          return step;
        }
      });
    };
    
    setWorkflow({
      ...workflow,
      steps: updateSteps(workflow.steps)
    });
  };
  
  // Delete a step from the workflow
  const deleteStep = (stepId) => {
    // Helper function to recursively find and delete the step
    const filterSteps = (steps) => {
      return steps.filter(step => {
        if (step.id === stepId) {
          return false;
        } else if (step.type === STEP_TYPE.COMPOSITE && step.childSteps) {
          return {
            ...step,
            childSteps: filterSteps(step.childSteps)
          };
        } else {
          return true;
        }
      }).map(step => {
        if (step.type === STEP_TYPE.COMPOSITE && step.childSteps) {
          return {
            ...step,
            childSteps: filterSteps(step.childSteps)
          };
        } else {
          return step;
        }
      });
    };
    
    let updatedSteps = filterSteps(workflow.steps);
    
    // Ensure there's always at least one step
    if (updatedSteps.length === 0) {
      updatedSteps = [
        {
          id: generateStepId(),
          type: STEP_TYPE.ATOMIC,
          name: 'Step 1',
          toolAssignment: ''
        }
      ];
    }
    
    setWorkflow({
      ...workflow,
      steps: updatedSteps
    });
  };
  
  // Save workflow name changes
  const saveWorkflowName = () => {
    setWorkflow({
      ...workflow,
      name: workflowName
    });
    setEditing(false);
  };
  
  // Export workflow as JSON
  const exportWorkflow = () => {
    const jsonString = JSON.stringify(workflow, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflow.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Validate workflow
  const validateWorkflow = () => {
    // Helper function to recursively validate steps
    const validateSteps = (steps) => {
      return steps.every(step => {
        if (step.type === STEP_TYPE.ATOMIC) {
          return !!step.toolAssignment;
        } else if (step.type === STEP_TYPE.COMPOSITE) {
          return step.childSteps && 
                 step.childSteps.length > 0 && 
                 validateSteps(step.childSteps);
        }
        return false;
      });
    };
    
    return validateSteps(workflow.steps);
  };
  
  const isValid = validateWorkflow();
  
  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 rounded-lg shadow">
      <div className="mb-6 flex justify-between items-center">
        <div className="flex-grow">
          {editing ? (
            <div className="flex items-center">
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="text-2xl font-bold bg-white border rounded px-3 py-2 mr-2 flex-grow"
                autoFocus
              />
              <button 
                onClick={saveWorkflowName}
                className="px-3 py-2 bg-blue-500 text-white rounded"
              >
                Save
              </button>
            </div>
          ) : (
            <h1 
              className="text-2xl font-bold cursor-pointer"
              onClick={() => setEditing(true)}
            >
              {workflow.name}
            </h1>
          )}
        </div>
        <div>
          <button
            onClick={exportWorkflow}
            disabled={!isValid}
            className={`px-4 py-2 rounded mr-2 ${
              isValid 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={!isValid ? 'Workflow validation failed' : 'Export workflow'}
          >
            Export Workflow
          </button>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="text-sm mb-2 text-gray-500">
          Build your workflow by adding steps. Each step can be either:
          <ul className="list-disc ml-5 mt-1">
            <li><strong>Atomic</strong> - Needs a tool assignment</li>
            <li><strong>Composite</strong> - Contains child steps (which follow the same rules)</li>
          </ul>
        </div>
        
        {!isValid && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded">
            <strong>Validation Error:</strong> Ensure all atomic steps have tool assignments and all composite steps have at least one child step.
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        {workflow.steps.map(step => (
          <Step
            key={step.id}
            step={step}
            onChange={updateStep}
            onDelete={deleteStep}
            onAddChild={addChildStep}
          />
        ))}
      </div>
      
      <div className="mt-6">
        <button 
          onClick={addStep}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
        >
          <Plus size={18} className="mr-1" /> Add Step
        </button>
      </div>
    </div>
  );
};

export default WorkflowBuilder;