import React from 'react';
import { Schema, SchemaValueType } from '../../types/schema';
import FileLibrary from '../FileLibrary';

interface SchemaFormProps {
    schema: Schema;
    value: SchemaValueType;
    onChange: (value: SchemaValueType) => void;
    inputRef?: React.RefObject<HTMLInputElement>;
}

const SchemaForm: React.FC<SchemaFormProps> = ({ schema, value, onChange, inputRef }) => {
    if (schema.type === 'object' && !schema.is_array) {
        const objectValue = (value as Record<string, SchemaValueType>) || {};
        return (
            <div className="space-y-4">
                {Object.entries(schema.fields || {}).map(([fieldName, fieldSchema]) => (
                    <div key={fieldName}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {fieldName}
                            {fieldSchema.description && (
                                <span className="ml-1 text-sm text-gray-500">
                                    ({fieldSchema.description})
                                </span>
                            )}
                        </label>
                        <SchemaForm
                            schema={fieldSchema}
                            value={objectValue[fieldName]}
                            onChange={newValue => onChange({
                                ...objectValue,
                                [fieldName]: newValue
                            })}
                        />
                    </div>
                ))}
            </div>
        );
    }

    if (schema.is_array) {
        const arrayValue = Array.isArray(value) ? (value as SchemaValueType[]) : [];
        const itemSchema = { ...schema, is_array: false };
        return (
            <div className="space-y-2">
                {arrayValue.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start">
                        <SchemaForm
                            schema={itemSchema}
                            value={item}
                            onChange={newValue => {
                                const newArray = [...arrayValue];
                                newArray[index] = newValue;
                                onChange(newArray as unknown as SchemaValueType);
                            }}
                        />
                        <button
                            onClick={() => {
                                onChange(arrayValue.filter((_, i) => i !== index) as unknown as SchemaValueType);
                            }}
                            className="text-red-600 dark:text-red-400 hover:text-red-700"
                        >
                            Remove
                        </button>
                    </div>
                ))}
                <button
                    onClick={() => onChange([...arrayValue, getDefaultValue(itemSchema)] as unknown as SchemaValueType)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700"
                >
                    Add Item
                </button>
            </div>
        );
    }

    if (schema.type === 'file') {
        const fileValue = value as { file_id?: string } | undefined;
        return (
            <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {schema.description || 'Please select a file from the library below or upload a new one.'}
                </p>
                <FileLibrary
                    selectedFileId={fileValue?.file_id}
                    onFileSelect={(fileId) => onChange({ file_id: fileId } as SchemaValueType)}
                />
            </div>
        );
    }

    if (schema.type === 'string') {
        return (
            <input
                type="text"
                value={(value as string) || ''}
                onChange={e => onChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                ref={inputRef}
            />
        );
    }

    if (schema.type === 'number') {
        return (
            <input
                type="number"
                value={(value as number) || ''}
                onChange={e => onChange(parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                ref={inputRef}
            />
        );
    }

    if (schema.type === 'boolean') {
        return (
            <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={e => onChange(e.target.checked)}
                className="h-4 w-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 
                         rounded focus:ring-blue-500 dark:focus:ring-blue-400"
            />
        );
    }

    return null;
};

// Helper to get default value for a schema type
const getDefaultValue = (schema: Schema): SchemaValueType => {
    if (schema.type === 'string') return '';
    if (schema.type === 'number') return 0;
    if (schema.type === 'boolean') return false;
    if (schema.type === 'file') return { file_id: '' };
    if (schema.type === 'object') {
        const result: Record<string, SchemaValueType> = {};
        if (schema.fields) {
            for (const [key, fieldSchema] of Object.entries(schema.fields)) {
                result[key] = getDefaultValue(fieldSchema);
            }
        }
        return result;
    }
    return '';
};

export default SchemaForm; 