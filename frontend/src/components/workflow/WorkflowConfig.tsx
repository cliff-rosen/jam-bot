
import { Schema, ValueType, SchemaValueType } from '@/types/schema';
import { WorkflowVariable, createBasicSchema, WorkflowVariableName } from '@/types/workflows';
import { useWorkflows } from '@/context/WorkflowContext';
import { FileInfo } from '@/lib/api/fileApi';
import Dialog from '@/components/common/Dialog';
import FileLibrary from '@/components/FileLibrary';
import { fileApi } from '@/lib/api/fileApi';
import SchemaEditor from '@/components/common/SchemaEditor';
import SchemaValueEditor from '@/components/common/SchemaValueEditor';
import VariableRenderer from '@/components/common/VariableRenderer';
import { useState } from 'react';

const VALUE_TYPES: ValueType[] = ['string', 'number', 'boolean', 'file', 'object'];

interface SchemaFieldProps {
    value: Schema;
    onChange: (value: Schema) => void;
    onRemove: () => void;
    indent?: number;
    onFileSelect?: (file: FileInfo, value: Schema) => void;
}

const SchemaField: React.FC<SchemaFieldProps> = ({ value, onChange, onRemove, indent = 0, onFileSelect }) => {
    const [showFileSelector, setShowFileSelector] = useState(false);
    const [fieldNameInput, setFieldNameInput] = useState('');
    const [isEditingFieldName, setIsEditingFieldName] = useState(false);

    const handleTypeChange = (type: ValueType) => {
        onChange({ ...value, type });
    };

    const handleArrayChange = (isArray: boolean) => {
        onChange({ ...value, is_array: isArray });
    };

    const handleFileSelect = (file: FileInfo) => {
        if (onFileSelect) {
            onFileSelect(file, value);
            setShowFileSelector(false);
        }
    };

    return (
        <div className="space-y-4" style={{ marginLeft: `${indent * 20}px` }}>
            <div className="flex items-center gap-4">
                <select
                    value={value.type}
                    onChange={e => handleTypeChange(e.target.value as ValueType)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md"
                >
                    {VALUE_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={value.is_array}
                        onChange={e => handleArrayChange(e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Is Array</span>
                </label>
                <button
                    onClick={onRemove}
                    className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                    ×
                </button>
            </div>

            {value.type === 'file' && onFileSelect && (
                <div className="mt-2">
                    <button
                        onClick={() => setShowFileSelector(true)}
                        className="px-4 py-2 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800"
                    >
                        Select File
                    </button>

                    {showFileSelector && (
                        <Dialog
                            isOpen={showFileSelector}
                            onClose={() => setShowFileSelector(false)}
                            title="Select File"
                            maxWidth="2xl"
                        >
                            <FileLibrary
                                onFileSelect={async (fileId) => {
                                    try {
                                        const file = await fileApi.getFile(fileId);
                                        handleFileSelect(file);
                                    } catch (err) {
                                        console.error('Error fetching file:', err);
                                    }
                                }}
                            />
                        </Dialog>
                    )}
                </div>
            )}

            {value.type === 'object' && 'fields' in value && (
                <div className="ml-8 space-y-4">
                    {Object.entries(value.fields || {}).map(([fieldName, fieldValue]) => (
                        <div key={fieldName} className="border-l-2 border-gray-200 dark:border-gray-700 pl-2">
                            <div className="flex items-center mb-2">
                                {isEditingFieldName && fieldName === fieldNameInput ? (
                                    <input
                                        type="text"
                                        value={fieldNameInput}
                                        onChange={(e) => setFieldNameInput(e.target.value)}
                                        onBlur={() => {
                                            if (fieldNameInput && fieldNameInput !== fieldName) {
                                                const newFields = { ...value.fields };
                                                delete newFields[fieldName];
                                                newFields[fieldNameInput] = fieldValue;
                                                onChange({ ...value, fields: newFields });
                                            }
                                            setIsEditingFieldName(false);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.currentTarget.blur();
                                            }
                                        }}
                                        className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded"
                                        autoFocus
                                    />
                                ) : (
                                    <div
                                        className="font-medium text-sm text-gray-800 dark:text-gray-200 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                        onClick={() => {
                                            setFieldNameInput(fieldName);
                                            setIsEditingFieldName(true);
                                        }}
                                    >
                                        Field Name: <span className="font-bold">{fieldName}</span>
                                    </div>
                                )}
                            </div>
                            <SchemaField
                                value={fieldValue}
                                onChange={newValue => {
                                    const newFields = { ...value.fields };
                                    newFields[fieldName] = newValue;
                                    onChange({ ...value, fields: newFields });
                                }}
                                onRemove={() => {
                                    const { [fieldName]: removed, ...newFields } = value.fields || {};
                                    onChange({ ...value, fields: newFields });
                                }}
                                indent={indent + 1}
                                onFileSelect={onFileSelect}
                            />
                        </div>
                    ))}
                    <div className="flex items-center">
                        <input
                            type="text"
                            value={fieldNameInput}
                            onChange={(e) => setFieldNameInput(e.target.value)}
                            placeholder="New field name"
                            className="ml-8 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md"
                        />
                        <button
                            onClick={() => {
                                if (fieldNameInput.trim()) {
                                    const newFields = { ...value.fields };
                                    newFields[fieldNameInput] = createBasicSchema('string');
                                    onChange({ ...value, fields: newFields });
                                    setFieldNameInput('');
                                } else {
                                    const newFields = { ...value.fields };
                                    const fieldName = `field${Object.keys(newFields).length + 1}`;
                                    newFields[fieldName] = createBasicSchema('string');
                                    onChange({ ...value, fields: newFields });
                                }
                            }}
                            className="ml-2 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                            + Add Field
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper function to determine if a value should be expandable
const isExpandable = (variable: WorkflowVariable): boolean => {
    if (!variable.value) return false;

    // Check if it's an array or object
    if (Array.isArray(variable.value) || (typeof variable.value === 'object' && variable.value !== null)) {
        return true;
    }

    // Check if it's a long string
    if (typeof variable.value === 'string' && variable.value.length > 50) {
        return true;
    }

    return false;
};

// Badge component for variable type
const TypeBadge: React.FC<{ type: 'input' | 'output' | 'evaluation' }> = ({ type }) => {
    const colors = {
        input: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        output: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        evaluation: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
    };

    return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[type]}`}>
            {type}
        </span>
    );
};

const WorkflowIOEditor: React.FC = () => {
    const { workflow, updateWorkflowByAction } = useWorkflows();
    const [variables, setVariables] = useState<WorkflowVariable[]>([]);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [editingVariable, setEditingVariable] = useState<string | null>(null);
    const [editingSchema, setEditingSchema] = useState<string | null>(null);
    const [newVariableName, setNewVariableName] = useState('');
    const [newVariableType, setNewVariableType] = useState<'input' | 'output'>('input');
    const [showFileSelector, setShowFileSelector] = useState(false);
    const [selectedSchema, setSelectedSchema] = useState<Schema | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
    const [schemaDialogOpen, setSchemaDialogOpen] = useState(false);
    const [currentEditingSchema, setCurrentEditingSchema] = useState<{ variableId: string, schema: Schema } | null>(null);
    const [valueEditorOpen, setValueEditorOpen] = useState(false);
    const [currentEditingValue, setCurrentEditingValue] = useState<{ variableId: string, value: SchemaValueType | undefined, schema: Schema } | null>(null);

    useEffect(() => {
        if (workflow?.state) {
            setVariables(workflow.state);
        }
    }, [workflow]);

    const handleVariableChange = (variable_id: string, updates: Partial<WorkflowVariable>) => {
        const updatedVariables = variables.map(v =>
            v.variable_id === variable_id ? { ...v, ...updates } : v
        );

        updateWorkflowByAction({
            type: 'UPDATE_STATE',
            payload: {
                state: updatedVariables
            }
        });
    };

    const handleAddVariable = () => {
        if (!newVariableName.trim()) return;

        const newVariable: WorkflowVariable = {
            variable_id: `var-${Date.now()}`,
            name: newVariableName as WorkflowVariableName,
            schema: createBasicSchema('string'),
            io_type: newVariableType
        };

        const updatedVariables = [...variables, newVariable];

        updateWorkflowByAction({
            type: 'UPDATE_STATE',
            payload: {
                state: updatedVariables
            }
        });

        setNewVariableName('');
    };

    const handleRemoveVariable = (variable_id: string) => {
        const updatedVariables = variables.filter(v => v.variable_id !== variable_id);

        updateWorkflowByAction({
            type: 'UPDATE_STATE',
            payload: {
                state: updatedVariables
            }
        });

        if (editingVariable === variable_id) {
            setEditingVariable(null);
        }
        if (editingSchema === variable_id) {
            setEditingSchema(null);
        }
        setDeleteConfirmation(null);
    };

    const toggleRowExpansion = (variable_id: string) => {
        const newExpandedRows = new Set(expandedRows);
        if (newExpandedRows.has(variable_id)) {
            newExpandedRows.delete(variable_id);
        } else {
            newExpandedRows.add(variable_id);
        }
        setExpandedRows(newExpandedRows);
    };

    const handleFileSelect = (file: FileInfo) => {
        if (selectedSchema && editingVariable) {
            // Create updated schema while preserving array type
            const updatedSchema = createBasicSchema('file', file.description);
            updatedSchema.is_array = selectedSchema.is_array;

            handleVariableChange(editingVariable, { schema: updatedSchema });
            setShowFileSelector(false);
            setSelectedSchema(null);
        }
    };

    const openSchemaEditor = (variableId: string, schema: Schema) => {
        setCurrentEditingSchema({ variableId, schema });
        setSchemaDialogOpen(true);
    };

    const handleSchemaChange = (schema: Schema) => {
        if (currentEditingSchema) {
            handleVariableChange(currentEditingSchema.variableId, { schema });
        }
    };

    const openValueEditor = (variableId: string, value: SchemaValueType | undefined, schema: Schema) => {
        console.log("Opening value editor for variable:", variableId, "with value:", value, "and schema:", schema);
        setCurrentEditingValue({ variableId, value, schema });
        setValueEditorOpen(true);
    };

    const handleValueChange = (value: SchemaValueType) => {
        console.log("Handling value change:", value);
        if (currentEditingValue) {
            handleVariableChange(currentEditingValue.variableId, { value });
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden bg-gray-900/50 flex items-start justify-center">
            <div className="w-full h-full bg-white dark:bg-gray-900 shadow-xl border-b border-gray-200 dark:border-gray-700 flex flex-col">
                {/* Header */}
                <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Workflow Variables
                            </h1>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Configure the inputs and outputs for your workflow. Define what data your workflow needs and what it produces.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                // This will be handled by the parent component
                                const event = new CustomEvent('closeWorkflowVariables');
                                window.dispatchEvent(event);
                            }}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Add Variable Form */}
                <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex flex-wrap gap-4 items-end">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Variable Type
                                </label>
                                <select
                                    value={newVariableType}
                                    onChange={(e) => setNewVariableType(e.target.value as 'input' | 'output')}
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-gray-900 dark:text-gray-100"
                                >
                                    <option value="input">Input</option>
                                    <option value="output">Output</option>
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Variable Name
                                </label>
                                <input
                                    type="text"
                                    value={newVariableName}
                                    onChange={(e) => setNewVariableName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-gray-900 dark:text-gray-100"
                                    placeholder="Enter variable name"
                                />
                            </div>
                            <button
                                onClick={handleAddVariable}
                                disabled={!newVariableName.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                            >
                                Add Variable
                            </button>
                        </div>
                    </div>
                </div>

                {/* Variables Table */}
                <div className="flex-1 overflow-auto">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Name
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Description
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Data Type
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Value
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                                    {variables.map((variable) => (
                                        <React.Fragment key={variable.variable_id}>
                                            <tr
                                                className={`${isExpandable(variable) ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50' : ''}`}
                                                onClick={() => isExpandable(variable) && toggleRowExpansion(variable.variable_id)}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <TypeBadge type={variable.io_type} />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {editingVariable === variable.variable_id ? (
                                                        <input
                                                            type="text"
                                                            value={variable.name}
                                                            onChange={(e) => handleVariableChange(variable.variable_id, {
                                                                name: e.target.value as WorkflowVariableName
                                                            })}
                                                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-gray-900 dark:text-gray-100"
                                                            onBlur={() => setEditingVariable(null)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    ) : (
                                                        <div
                                                            className="font-medium text-gray-900 dark:text-gray-100"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingVariable(variable.variable_id);
                                                            }}
                                                        >
                                                            {variable.name}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {editingVariable === variable.variable_id ? (
                                                        <textarea
                                                            value={variable.schema.description || ''}
                                                            onChange={(e) => handleVariableChange(variable.variable_id, {
                                                                schema: { ...variable.schema, description: e.target.value }
                                                            })}
                                                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-gray-900 dark:text-gray-100"
                                                            rows={2}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    ) : (
                                                        <div
                                                            className="text-sm text-gray-700 dark:text-gray-300"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingVariable(variable.variable_id);
                                                            }}
                                                        >
                                                            {variable.schema.description || 'No description'}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div
                                                        className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openSchemaEditor(variable.variable_id, variable.schema);
                                                        }}
                                                    >
                                                        {variable.schema.type}{variable.schema.is_array ? '[]' : ''}
                                                        <span className="ml-1 text-blue-600 dark:text-blue-400">(Edit)</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div
                                                        className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openValueEditor(variable.variable_id, variable.value, variable.schema);
                                                        }}
                                                    >
                                                        {variable.value !== undefined ? (
                                                            <div className="flex items-center">
                                                                <span className="truncate max-w-xs">
                                                                    {typeof variable.value === 'object'
                                                                        ? (Array.isArray(variable.value)
                                                                            ? `Array(${variable.value.length})`
                                                                            : `Object(${Object.keys(variable.value || {}).length})`)
                                                                        : String(variable.value).substring(0, 50) + (String(variable.value).length > 50 ? '...' : '')}
                                                                </span>
                                                                <span className="ml-2 text-blue-600 dark:text-blue-400">(Edit)</span>
                                                            </div>
                                                        ) : (
                                                            <div className="text-gray-400 dark:text-gray-500 italic">
                                                                Click to edit
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    {variable.io_type !== 'evaluation' && (
                                                        <>
                                                            {deleteConfirmation === variable.variable_id ? (
                                                                <div className="flex items-center justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400">Confirm?</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleRemoveVariable(variable.variable_id);
                                                                        }}
                                                                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 font-medium"
                                                                    >
                                                                        Yes
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setDeleteConfirmation(null);
                                                                        }}
                                                                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
                                                                    >
                                                                        No
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setDeleteConfirmation(variable.variable_id);
                                                                    }}
                                                                    className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                                                                >
                                                                    Delete
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                            {expandedRows.has(variable.variable_id) && (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50">
                                                        <div className="text-sm text-gray-800 dark:text-gray-200">
                                                            {variable.value !== undefined ? (
                                                                <VariableRenderer
                                                                    value={variable.value}
                                                                    schema={variable.schema}
                                                                    maxTextLength={500}
                                                                    maxArrayItems={10}
                                                                />
                                                            ) : (
                                                                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-gray-500 dark:text-gray-400 italic">No value set</span>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                openValueEditor(variable.variable_id, undefined, variable.schema);
                                                                            }}
                                                                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                                                        >
                                                                            Edit Value
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                    {variables.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                                No variables defined. Add a variable to get started.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Schema Editor Dialog */}
                {schemaDialogOpen && currentEditingSchema && (
                    <Dialog
                        isOpen={schemaDialogOpen}
                        onClose={() => setSchemaDialogOpen(false)}
                        title="Edit Schema"
                        maxWidth="3xl"
                    >
                        <div className="p-4">
                            <SchemaEditor
                                schema={currentEditingSchema.schema}
                                onChange={handleSchemaChange}
                                onCancel={() => setSchemaDialogOpen(false)}
                                compact={false}
                                isNested={false}
                            />
                        </div>
                    </Dialog>
                )}

                {/* Value Editor Dialog */}
                {valueEditorOpen && currentEditingValue && (
                    <Dialog
                        isOpen={valueEditorOpen}
                        onClose={() => setValueEditorOpen(false)}
                        title="Edit Value"
                        maxWidth="3xl"
                    >
                        <div className="p-4">
                            <SchemaValueEditor
                                schema={currentEditingValue.schema}
                                value={currentEditingValue.value}
                                onChange={handleValueChange}
                                onCancel={() => setValueEditorOpen(false)}
                            />
                        </div>
                    </Dialog>
                )}

                {/* File Selector Dialog */}
                {showFileSelector && (
                    <Dialog
                        isOpen={showFileSelector}
                        onClose={() => setShowFileSelector(false)}
                        title="Select File"
                        maxWidth="2xl"
                    >
                        <FileLibrary
                            onFileSelect={async (fileId) => {
                                try {
                                    const file = await fileApi.getFile(fileId);
                                    handleFileSelect(file);
                                } catch (err) {
                                    console.error('Error fetching file:', err);
                                }
                            }}
                        />
                    </Dialog>
                )}
            </div>
        </div>
    );
};

export default WorkflowIOEditor; 