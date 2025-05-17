import React, { useEffect, useState } from 'react';
import { WorkflowStep, WorkflowVariableName, WorkflowVariable, Workflow, addWorkflowVariable, EnhancedOutputMapping } from '@/types/workflows';
import { Tool, ToolParameterName, ToolOutputName } from '@/types/tools';
import { toolApi } from '@/lib/api/toolApi';
import { ToolEngine } from '@/lib/tool/toolEngine';
import PromptTemplateSelector from '@/components/workflow/PromptTemplateSelector';
import DataFlowMapper2 from '@/components/workflow/DataFlowMapper2';
import { useWorkflows } from '@/context/WorkflowContext';
import ToolSelector from '@/components/workflow/ToolSelector';

interface ToolActionEditorProps {
    step: WorkflowStep;
    tools: Tool[];
    onStepUpdate: (step: WorkflowStep) => void;
}

const ToolActionEditor: React.FC<ToolActionEditorProps> = ({
    step,
    tools,
    onStepUpdate
}) => {
    const { workflow, updateWorkflowByAction } = useWorkflows();

    const handleToolSelect = (tool: Tool | undefined) => {
        console.log('handleToolSelect', tool);

        updateWorkflowByAction({
            type: 'UPDATE_STEP_TOOL',
            payload: {
                stepId: step.step_id,
                tool
            }
        });
    };

    const handleTemplateChange = async (templateId: string) => {
        console.log('handleTemplateChange', templateId);
        if (!step.tool) return;

        try {
            const updatedStep = await ToolEngine.updateWorkflowStepWithTemplate(
                step,
                templateId
            );
            onStepUpdate(updatedStep);
        } catch (err) {
            console.error('Error updating step with template:', err);
        }
    };

    const handleParameterMappingChange = (parameterMappings: Record<ToolParameterName, WorkflowVariableName>) => {
        updateWorkflowByAction({
            type: 'UPDATE_PARAMETER_MAPPINGS',
            payload: {
                stepId: step.step_id,
                mappings: parameterMappings
            }
        });
    };

    const handleOutputMappingChange = (outputMappings: Record<ToolOutputName, WorkflowVariableName | EnhancedOutputMapping>) => {
        updateWorkflowByAction({
            type: 'UPDATE_OUTPUT_MAPPINGS',
            payload: {
                stepId: step.step_id,
                mappings: outputMappings
            }
        });
    };

    const handleAddVariable = (newVariable: WorkflowVariable) => {
        if (!workflow) return;

        const updatedWorkflow = addWorkflowVariable(workflow, newVariable);
        updateWorkflowByAction({
            type: 'UPDATE_WORKFLOW',
            payload: {
                workflowUpdates: { state: updatedWorkflow.state }
            }
        });
    };

    return (
        <div className="space-y-4">
            {/* Compact Tool Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                <ToolSelector
                    tools={tools}
                    selectedTool={step.tool}
                    onSelect={handleToolSelect}
                />
            </div>

            {/* Prompt Template Selection (for LLM tools) - more compact */}
            {step.tool?.tool_type === 'llm' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                    <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Select Prompt Template
                    </h3>
                    <PromptTemplateSelector
                        step={step}
                        onTemplateChange={handleTemplateChange}
                    />
                </div>
            )}

            {/* Data Flow Mapping - more compact */}
            {step.tool && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                    <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Data Flow Mapping
                    </h3>
                    <DataFlowMapper2
                        tool={step.tool}
                        parameter_mappings={step.parameter_mappings || {}}
                        output_mappings={step.output_mappings || {}}
                        workflowState={workflow?.state || []}
                        onParameterMappingChange={handleParameterMappingChange}
                        onOutputMappingChange={handleOutputMappingChange}
                        onVariableCreate={handleAddVariable}
                    />
                </div>
            )}
        </div>
    );
};

export default ToolActionEditor; 