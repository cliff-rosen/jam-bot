import React, { useState, useEffect } from 'react';
import { Schema, SchemaValueType } from '../../types/schema';

interface SchemaValueEditorProps {
    schema: Schema;
    value: SchemaValueType | undefined;
    onChange: (value: SchemaValueType) => void;
    onCancel?: () => void;
    isNested?: boolean;
}

const SchemaValueEditor: React.FC<SchemaValueEditorProps> = ({
    schema,
    value,
    onChange,
    onCancel,
    isNested = false
}) => {
    // Get default value based on schema type
    const getDefaultValue = (): any => {
        if (schema.is_array) {
            return [];
        }

        switch (schema.type) {
            case 'string': return '';
            case 'number': return 0;
            case 'boolean': return false;
            case 'object': {
                // For objects, initialize with empty values for all fields
                if (!schema.fields) return {};

                const obj: Record<string, any> = {};
                Object.entries(schema.fields).forEach(([fieldName, fieldSchema]) => {
                    if (fieldSchema.is_array) {
                        obj[fieldName] = [];
                    } else {
                        switch (fieldSchema.type) {
                            case 'string': obj[fieldName] = ''; break;
                            case 'number': obj[fieldName] = 0; break;
                            case 'boolean': obj[fieldName] = false; break;
                            case 'object': obj[fieldName] = {}; break;
                            case 'file': obj[fieldName] = null; break;
                            default: obj[fieldName] = '';
                        }
                    }
                });
                return obj;
            }
            case 'file': return {
                file_id: '',
                name: '',
                content: new Uint8Array(),
                mime_type: '',
                size: 0,
                created_at: '',
                updated_at: ''
            };
            default: return '';
        }
    };

    // Initialize form state with value or default
    const [formState, setFormState] = useState<any>(() => {
        if (value !== undefined) {
            if (schema.type === 'object' && schema.fields) {
                // For objects, ensure all fields have values
                const initialValue = { ...value };
                Object.entries(schema.fields).forEach(([fieldName, fieldSchema]) => {
                    if (initialValue[fieldName] === undefined) {
                        if (fieldSchema.is_array) {
                            initialValue[fieldName] = [];
                        } else {
                            switch (fieldSchema.type) {
                                case 'string': initialValue[fieldName] = ''; break;
                                case 'number': initialValue[fieldName] = 0; break;
                                case 'boolean': initialValue[fieldName] = false; break;
                                case 'object': initialValue[fieldName] = {}; break;
                                case 'file': initialValue[fieldName] = null; break;
                                default: initialValue[fieldName] = '';
                            }
                        }
                    }
                });
                return initialValue;
            }
            return value;
        }
        return getDefaultValue();
    });

    // Update form state when props change
    useEffect(() => {
        if (value !== undefined) {
            if (schema.type === 'object' && schema.fields) {
                // For objects, ensure all fields have values
                const updatedValue = { ...value };
                Object.entries(schema.fields).forEach(([fieldName, fieldSchema]) => {
                    if (updatedValue[fieldName] === undefined) {
                        if (fieldSchema.is_array) {
                            updatedValue[fieldName] = [];
                        } else {
                            switch (fieldSchema.type) {
                                case 'string': updatedValue[fieldName] = ''; break;
                                case 'number': updatedValue[fieldName] = 0; break;
                                case 'boolean': updatedValue[fieldName] = false; break;
                                case 'object': updatedValue[fieldName] = {}; break;
                                case 'file': updatedValue[fieldName] = null; break;
                                default: updatedValue[fieldName] = '';
                            }
                        }
                    }
                });
                setFormState(updatedValue);
            } else {
                setFormState(value);
            }
        } else {
            setFormState(getDefaultValue());
        }
    }, [value, schema]);

    // Handle save button click
    const handleSave = () => {
        onChange(formState);
        if (onCancel) onCancel();
    };

    // Render a string input
    const renderStringInput = () => (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                String Value
            </label>
            {typeof formState === 'string' && formState.length > 100 ? (
                <textarea
                    value={formState}
                    onChange={(e) => setFormState(e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-gray-900 dark:text-gray-100"
                />
            ) : (
                <input
                    type="text"
                    value={formState || ''}
                    onChange={(e) => setFormState(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-gray-900 dark:text-gray-100"
                />
            )}
        </div>
    );

    // Render a number input
    const renderNumberInput = () => (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Number Value
            </label>
            <input
                type="number"
                value={formState || 0}
                onChange={(e) => setFormState(parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-gray-900 dark:text-gray-100"
            />
        </div>
    );

    // Render a boolean input
    const renderBooleanInput = () => (
        <div className="space-y-2">
            <label className="flex items-center space-x-2">
                <input
                    type="checkbox"
                    checked={!!formState}
                    onChange={(e) => setFormState(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-700 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Boolean Value
                </span>
            </label>
        </div>
    );

    // Render an object form
    const renderObjectForm = () => {
        if (!schema.fields) return null;

        return (
            <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Object Fields
                </h3>
                <div className="space-y-3">
                    {Object.entries(schema.fields).map(([fieldName, fieldSchema]) => (
                        <div key={fieldName} className="border border-gray-200 dark:border-gray-700 rounded-md p-3">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {fieldName}
                                {fieldSchema.description && (
                                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                        ({fieldSchema.description})
                                    </span>
                                )}
                            </h4>
                            {fieldSchema.type === 'string' && (
                                <input
                                    type="text"
                                    value={formState[fieldName] || ''}
                                    onChange={(e) => {
                                        const newState = { ...formState };
                                        newState[fieldName] = e.target.value;
                                        setFormState(newState);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-gray-900 dark:text-gray-100"
                                />
                            )}
                            {fieldSchema.type === 'number' && (
                                <input
                                    type="number"
                                    value={formState[fieldName] || 0}
                                    onChange={(e) => {
                                        const newState = { ...formState };
                                        newState[fieldName] = parseFloat(e.target.value);
                                        setFormState(newState);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-gray-900 dark:text-gray-100"
                                />
                            )}
                            {fieldSchema.type === 'boolean' && (
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={!!formState[fieldName]}
                                        onChange={(e) => {
                                            const newState = { ...formState };
                                            newState[fieldName] = e.target.checked;
                                            setFormState(newState);
                                        }}
                                        className="rounded border-gray-300 dark:border-gray-700 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Boolean Value
                                    </span>
                                </label>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Render an array form
    const renderArrayForm = () => {
        if (!Array.isArray(formState)) {
            setFormState([]);
            return null;
        }

        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Array Items ({formState.length})
                    </h3>
                    <button
                        type="button"
                        onClick={() => {
                            let defaultValue;
                            switch (schema.type) {
                                case 'string': defaultValue = ''; break;
                                case 'number': defaultValue = 0; break;
                                case 'boolean': defaultValue = false; break;
                                case 'object': defaultValue = {}; break;
                                default: defaultValue = '';
                            }
                            setFormState([...formState, defaultValue]);
                        }}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Add Item
                    </button>
                </div>
                <div className="space-y-3">
                    {formState.map((item, index) => (
                        <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-md p-3">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Item {index + 1}
                                </h4>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newArray = [...formState];
                                        newArray.splice(index, 1);
                                        setFormState(newArray);
                                    }}
                                    className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                >
                                    Remove
                                </button>
                            </div>
                            {typeof item === 'string' && (
                                <input
                                    type="text"
                                    value={item}
                                    onChange={(e) => {
                                        const newArray = [...formState];
                                        newArray[index] = e.target.value;
                                        setFormState(newArray);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-gray-900 dark:text-gray-100"
                                />
                            )}
                            {typeof item === 'number' && (
                                <input
                                    type="number"
                                    value={item}
                                    onChange={(e) => {
                                        const newArray = [...formState];
                                        newArray[index] = parseFloat(e.target.value);
                                        setFormState(newArray);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-gray-900 dark:text-gray-100"
                                />
                            )}
                            {typeof item === 'boolean' && (
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={item}
                                        onChange={(e) => {
                                            const newArray = [...formState];
                                            newArray[index] = e.target.checked;
                                            setFormState(newArray);
                                        }}
                                        className="rounded border-gray-300 dark:border-gray-700 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Boolean Value
                                    </span>
                                </label>
                            )}
                        </div>
                    ))}
                    {formState.length === 0 && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                            No items in array. Click "Add Item" to add one.
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Render a file input
    const renderFileInput = () => (
        <div className="space-y-2">
            <div className="text-sm text-gray-700 dark:text-gray-300">
                File values can only be set by selecting a file from the file library.
            </div>
        </div>
    );

    // Render the appropriate form based on schema type
    const renderForm = () => {
        if (schema.is_array) {
            return renderArrayForm();
        }

        switch (schema.type) {
            case 'string': return renderStringInput();
            case 'number': return renderNumberInput();
            case 'boolean': return renderBooleanInput();
            case 'object': return renderObjectForm();
            case 'file': return renderFileInput();
            default: return null;
        }
    };

    return (
        <div className="space-y-4">
            {renderForm()}

            {!isNested && (
                <div className="flex justify-end space-x-2 mt-4">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleSave}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Save
                    </button>
                </div>
            )}
        </div>
    );
};

export default SchemaValueEditor; 