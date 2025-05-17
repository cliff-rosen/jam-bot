import React, { useState, useEffect, useCallback } from 'react';
import { Schema, ValueType } from '../../types/schema';

interface SchemaField {
    type: ValueType;
    description?: string;
}

interface SchemaEditorProps {
    schema: Schema;
    onChange: (schema: Schema) => void;
    onCancel?: () => void;
    compact?: boolean;
    isNested?: boolean;
}

interface EditingField {
    fieldName: string;
    value: string;
}

const SchemaEditor: React.FC<SchemaEditorProps> = ({ schema, onChange, onCancel, compact = false, isNested = false }) => {
    const [editMode, setEditMode] = useState<'gui' | 'json'>('gui');
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [jsonText, setJsonText] = useState('{}');
    const [editingFieldName, setEditingFieldName] = useState<EditingField | null>(null);
    const [newFieldName, setNewFieldName] = useState('');
    const [fieldToRemove, setFieldToRemove] = useState<string | null>(null);
    const [localSchema, setLocalSchema] = useState<Schema>(schema);

    // Update local schema when the prop changes
    useEffect(() => {
        setLocalSchema(schema);
    }, [schema]);

    // Update JSON text when schema changes or mode switches
    useEffect(() => {
        if (localSchema.type === 'object' && 'fields' in localSchema) {
            setJsonText(JSON.stringify(localSchema.fields || {}, null, 2));
        } else {
            setJsonText('{}');
        }
    }, [localSchema, editMode]);

    const updateSchema = useCallback((updatedSchema: Schema) => {
        setLocalSchema(updatedSchema);
        onChange(updatedSchema);
    }, [onChange]);

    const handleJsonChange = (text: string) => {
        setJsonText(text);
        try {
            const parsed = JSON.parse(text);
            setJsonError(null);
            const fields: Record<string, Schema> = {};

            Object.entries(parsed).forEach(([key, value]: [string, any]) => {
                // Handle both simple values and properly formatted schema objects
                if (typeof value === 'object' && value !== null && 'type' in value) {
                    fields[key] = {
                        type: (value.type || 'string') as ValueType,
                        is_array: value.is_array || false,
                        description: value.description || '',
                        ...(value.type === 'object' && value.fields ? { fields: value.fields } : {})
                    };
                } else {
                    fields[key] = {
                        type: 'string',
                        is_array: false,
                        description: ''
                    };
                }
            });

            updateSchema({
                ...localSchema,
                type: 'object',
                fields
            });
        } catch (err) {
            setJsonError('Invalid JSON format');
        }
    };

    const handleTypeChange = (type: ValueType) => {
        let updatedSchema: Schema;

        if (type === 'object') {
            updatedSchema = {
                ...localSchema,
                type: 'object',
                fields: localSchema.type === 'object' && localSchema.fields ? localSchema.fields : {}
            };
        } else {
            // For non-object types, remove the fields property if it exists
            const { fields, ...rest } = localSchema;
            updatedSchema = {
                ...rest,
                type
            };
        }

        updateSchema(updatedSchema);
    };

    const handleAddField = () => {
        if (localSchema.type !== 'object') return;

        const fieldName = newFieldName.trim()
            ? newFieldName.trim()
            : `field${Object.keys(localSchema.fields || {}).length + 1}`;

        const currentFields = localSchema.fields || {};

        // Check if field name already exists
        if (currentFields[fieldName]) {
            // If it exists, create a unique name by appending a number
            let counter = 1;
            let uniqueFieldName = `${fieldName}_${counter}`;
            while (currentFields[uniqueFieldName]) {
                counter++;
                uniqueFieldName = `${fieldName}_${counter}`;
            }

            const newFields = {
                ...currentFields,
                [uniqueFieldName]: {
                    type: 'string' as ValueType,
                    is_array: false,
                    description: ''
                }
            };

            updateSchema({
                ...localSchema,
                fields: newFields
            });
        } else {
            // If it doesn't exist, use the original name
            const newFields = {
                ...currentFields,
                [fieldName]: {
                    type: 'string' as ValueType,
                    is_array: false,
                    description: ''
                }
            };

            updateSchema({
                ...localSchema,
                fields: newFields
            });
        }

        setNewFieldName('');
    };

    const confirmRemoveField = (fieldName: string) => {
        setFieldToRemove(fieldName);
    };

    const handleRemoveField = () => {
        if (!fieldToRemove || localSchema.type !== 'object' || !localSchema.fields) {
            setFieldToRemove(null);
            return;
        }

        const currentFields = { ...localSchema.fields };
        delete currentFields[fieldToRemove];

        updateSchema({
            ...localSchema,
            fields: currentFields
        });

        setFieldToRemove(null);
    };

    const cancelRemoveField = () => {
        setFieldToRemove(null);
    };

    const handleFieldNameChange = (fieldName: string, value: string) => {
        setEditingFieldName({ fieldName, value });
    };

    const handleFieldNameBlur = () => {
        if (!editingFieldName || localSchema.type !== 'object' || !localSchema.fields) {
            setEditingFieldName(null);
            return;
        }

        const { fieldName, value } = editingFieldName;
        if (fieldName === value || !value.trim()) {
            setEditingFieldName(null);
            return;
        }

        const currentFields = localSchema.fields;

        // Check if the new field name already exists
        if (currentFields[value] && fieldName !== value) {
            // Don't change the name if it would overwrite an existing field
            setEditingFieldName(null);
            return;
        }

        const newFields: Record<string, Schema> = {};

        // Create a new fields object with the renamed field
        Object.entries(currentFields).forEach(([key, fieldValue]) => {
            if (key === fieldName) {
                newFields[value] = fieldValue;
            } else {
                newFields[key] = fieldValue;
            }
        });

        updateSchema({
            ...localSchema,
            fields: newFields
        });

        setEditingFieldName(null);
    };

    const handleFieldChange = (
        fieldName: string,
        property: 'type' | 'description' | 'is_array' | 'fields',
        value: any
    ) => {
        if (localSchema.type !== 'object' || !localSchema.fields) return;

        const currentFields = { ...localSchema.fields };
        const updatedField = { ...currentFields[fieldName] } as any;

        if (property === 'type' && value === 'object' && !updatedField.fields) {
            updatedField.fields = {};
        }

        updatedField[property] = value;
        currentFields[fieldName] = updatedField;

        updateSchema({
            ...localSchema,
            fields: currentFields
        });
    };

    const handleArrayChange = (isArray: boolean) => {
        updateSchema({
            ...localSchema,
            is_array: isArray
        });
    };

    return (
        <div className={`space-y-4 ${compact ? 'text-sm' : ''}`}>
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2 flex-wrap">
                    <label className={`block ${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-700 dark:text-gray-300 mr-2`}>
                        Schema Type:
                    </label>
                    <select
                        value={localSchema.type}
                        onChange={(e) => handleTypeChange(e.target.value as ValueType)}
                        className={`rounded-md border border-gray-300 dark:border-gray-600 
                                 shadow-sm ${compact ? 'py-0.5 px-1 text-xs' : 'py-1 px-2 text-sm'} focus:outline-none focus:ring-blue-500 
                                 focus:border-blue-500 dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
                    >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                        <option value="object">Object</option>
                        <option value="file">File</option>
                    </select>

                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={localSchema.is_array}
                            onChange={e => handleArrayChange(e.target.checked)}
                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                        />
                        <span className={`${compact ? 'text-xs' : 'text-sm'} text-gray-700 dark:text-gray-300`}>Is Array</span>
                    </label>

                    {localSchema.type === 'object' && (
                        <>
                            <button
                                type="button"
                                onClick={() => setEditMode('gui')}
                                className={`${compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'} rounded-md ${editMode === 'gui'
                                    ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                            >
                                Visual Editor
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditMode('json')}
                                className={`${compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'} rounded-md ${editMode === 'json'
                                    ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                            >
                                JSON Editor
                            </button>
                        </>
                    )}
                </div>
            </div>

            {localSchema.type !== 'object' ? (
                <div className={`${compact ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 ${compact ? 'p-2' : 'p-4'} rounded-md`}>
                    This schema will output a {localSchema.type} value{localSchema.is_array ? ' array' : ''}.
                </div>
            ) : editMode === 'json' ? (
                <div className={`${compact ? 'space-y-1' : 'space-y-2'}`}>
                    <textarea
                        value={jsonText}
                        onChange={(e) => setJsonText(e.target.value)}
                        rows={compact ? 4 : 8}
                        placeholder="Enter JSON schema"
                        className={`mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 
                                 shadow-sm ${compact ? 'py-1 px-2 text-xs' : 'py-2 px-3 text-sm'} focus:outline-none focus:ring-blue-500 
                                 focus:border-blue-500 font-mono dark:bg-gray-800
                                 text-gray-900 dark:text-gray-100`}
                    />
                    {jsonError && (
                        <p className={`${compact ? 'text-xs' : 'text-sm'} text-red-600 dark:text-red-400`}>{jsonError}</p>
                    )}
                </div>
            ) : (
                <div className={`${compact ? 'space-y-1' : 'space-y-3'}`}>
                    {localSchema.type === 'object' && localSchema.fields && Object.entries(localSchema.fields).map(([fieldName, field]) => (
                        <div key={fieldName} className="border border-gray-200 dark:border-gray-700 rounded-md p-3">
                            <div className="flex justify-between items-center mb-2">
                                {editingFieldName && editingFieldName.fieldName === fieldName ? (
                                    <input
                                        type="text"
                                        value={editingFieldName.value}
                                        onChange={(e) => handleFieldNameChange(fieldName, e.target.value)}
                                        onBlur={handleFieldNameBlur}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleFieldNameBlur();
                                            }
                                        }}
                                        className={`${compact ? 'text-xs' : 'text-sm'} border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
                                        autoFocus
                                    />
                                ) : (
                                    <div
                                        className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400`}
                                        onClick={() => handleFieldNameChange(fieldName, fieldName)}
                                    >
                                        {fieldName}
                                    </div>
                                )}

                                {fieldToRemove === fieldName ? (
                                    <div className="flex items-center space-x-2">
                                        <span className={`${compact ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400`}>
                                            Confirm?
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleRemoveField}
                                            className={`${compact ? 'text-xs' : 'text-sm'} text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300`}
                                        >
                                            Yes
                                        </button>
                                        <button
                                            type="button"
                                            onClick={cancelRemoveField}
                                            className={`${compact ? 'text-xs' : 'text-sm'} text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300`}
                                        >
                                            No
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => confirmRemoveField(fieldName)}
                                        className={`${compact ? 'text-xs' : 'text-sm'} text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300`}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <div className="flex-1">
                                    <label className={`block ${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-700 dark:text-gray-300 mb-1`}>
                                        Type
                                    </label>
                                    <select
                                        value={field.type}
                                        onChange={(e) => handleFieldChange(fieldName, 'type', e.target.value)}
                                        className={`w-full rounded-md border border-gray-300 dark:border-gray-600 
                                                 shadow-sm ${compact ? 'py-0.5 px-1 text-xs' : 'py-1 px-2 text-sm'} focus:outline-none focus:ring-blue-500 
                                                 focus:border-blue-500 dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
                                    >
                                        <option value="string">String</option>
                                        <option value="number">Number</option>
                                        <option value="boolean">Boolean</option>
                                        <option value="object">Object</option>
                                        <option value="file">File</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className={`block ${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-700 dark:text-gray-300 mb-1`}>
                                        Description
                                    </label>
                                    <input
                                        type="text"
                                        value={field.description || ''}
                                        onChange={(e) => handleFieldChange(fieldName, 'description', e.target.value)}
                                        className={`w-full rounded-md border border-gray-300 dark:border-gray-600 
                                                 shadow-sm ${compact ? 'py-0.5 px-1 text-xs' : 'py-1 px-2 text-sm'} focus:outline-none focus:ring-blue-500 
                                                 focus:border-blue-500 dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
                                        placeholder="Field description"
                                    />
                                </div>
                                <div>
                                    <label className={`block ${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-700 dark:text-gray-300 mb-1`}>
                                        Is Array
                                    </label>
                                    <input
                                        type="checkbox"
                                        checked={field.is_array}
                                        onChange={(e) => handleFieldChange(fieldName, 'is_array', e.target.checked)}
                                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                                    />
                                </div>
                            </div>

                            {field.type === 'object' && field.fields && (
                                <div className="mt-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                                    <SchemaEditor
                                        schema={field}
                                        onChange={(updatedField) => {
                                            const updatedFields = { ...localSchema.fields };
                                            updatedFields[fieldName] = updatedField;
                                            updateSchema({
                                                ...localSchema,
                                                fields: updatedFields
                                            });
                                        }}
                                        compact={true}
                                        isNested={true}
                                    />
                                </div>
                            )}
                        </div>
                    ))}

                    {localSchema.type === 'object' && (
                        <div className="flex items-center mt-2">
                            <input
                                type="text"
                                value={newFieldName}
                                onChange={(e) => setNewFieldName(e.target.value)}
                                placeholder="New field name"
                                className={`flex-1 rounded-md border border-gray-300 dark:border-gray-600 
                                         shadow-sm ${compact ? 'py-0.5 px-1 text-xs' : 'py-1 px-2 text-sm'} focus:outline-none focus:ring-blue-500 
                                         focus:border-blue-500 dark:bg-gray-800 text-gray-900 dark:text-gray-100 mr-2`}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleAddField();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleAddField}
                                className={`${compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'} bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700`}
                            >
                                Add Field
                            </button>
                        </div>
                    )}
                </div>
            )}

            {!isNested && (
                <div className="flex justify-end space-x-2 mt-4">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className={`${compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'} border border-gray-300 dark:border-gray-600 
                                    text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800`}
                        >
                            Cancel
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default SchemaEditor; 