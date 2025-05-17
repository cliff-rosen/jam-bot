import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PromptTemplate, PromptTemplateToken, PromptTemplateCreate, PromptTemplateUpdate, PromptTemplateTest } from '@/types/prompts';
import { Schema, SchemaValueType } from '@/types/schema';
import Dialog from '@/components/common/Dialog';
import SchemaEditor from '@/components/common/SchemaEditor';
import { usePromptTemplates } from '@/context/PromptTemplateContext';
import FileLibrary from '@/components/FileLibrary';
import { fileApi } from '@/lib/api/fileApi';

interface PromptTemplateEditorProps {
    template: PromptTemplate | null;
    onTemplateChange?: (templateId: string) => void;
    onClose: () => void;
}

const defaultOutputSchema: Schema = {
    type: 'string',
    is_array: false,
    description: 'Default output'
};

const PromptTemplateEditor: React.FC<PromptTemplateEditorProps> = ({
    template,
    onTemplateChange,
    onClose
}) => {
    const nameInputRef = useRef<HTMLInputElement>(null);
    const { updateTemplate, createTemplate, testTemplate } = usePromptTemplates();
    const [name, setName] = useState(template?.name || '');
    const [description, setDescription] = useState(template?.description || '');
    const [userMessageTemplate, setUserMessageTemplate] = useState(template?.user_message_template || '');
    const [systemMessageTemplate, setSystemMessageTemplate] = useState(template?.system_message_template || '');
    const [tokens, setTokens] = useState<PromptTemplateToken[]>(template?.tokens || []);
    const [outputSchema, setOutputSchema] = useState<Schema>(template?.output_schema || defaultOutputSchema);
    const [testParameters, setTestParameters] = useState<Record<string, string>>({});
    const [testResult, setTestResult] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [showFileSelector, setShowFileSelector] = useState(false);
    const [selectedTokenName, setSelectedTokenName] = useState<string | null>(null);
    const [fileNames, setFileNames] = useState<Record<string, string>>({});
    const [isTesting, setIsTesting] = useState(false);
    const [showTestSection, setShowTestSection] = useState(false);

    useEffect(() => {
        if (template) {
            setName(template.name);
            setDescription(template.description || '');
            setUserMessageTemplate(template.user_message_template);
            setSystemMessageTemplate(template.system_message_template || '');
            setTokens(template.tokens);
            setOutputSchema(template.output_schema);

            // Initialize test parameters
            const initialParams = template.tokens.reduce((acc, token) => ({
                ...acc,
                [token.name]: ''
            }), {});
            setTestParameters(initialParams);
        }
    }, [template]);

    useEffect(() => {
        if (nameInputRef.current) {
            nameInputRef.current.focus();
            nameInputRef.current.select();
        }
    }, []);

    const extractTokens = useCallback((text: string, existingTokens: PromptTemplateToken[], source: string) => {
        const regularTokenRegex = /{{([^}]+)}}/g;
        const fileTokenRegex = /<<file:([^>]+)>>/g;

        const regularMatches = text.matchAll(regularTokenRegex);
        const fileMatches = text.matchAll(fileTokenRegex);

        const regularTokens = [...new Set([...regularMatches].map(m => ({
            name: m[1],
            type: 'string' as const
        })))];

        const fileTokens = [...new Set([...fileMatches].map(m => ({
            name: m[1],
            type: 'file' as const
        })))];

        return [...regularTokens, ...fileTokens];
    }, []);

    const updateTokens = useCallback((userTemplate: string, systemTemplate: string) => {
        const userTokens = extractTokens(userTemplate, tokens, 'user');
        const systemTokens = extractTokens(systemTemplate, tokens, 'system');

        // Merge tokens, keeping only unique ones by name
        const uniqueTokens = [...userTokens, ...systemTokens].reduce((acc, token) => {
            if (!acc.find(t => t.name === token.name)) {
                acc.push(token);
            }
            return acc;
        }, [] as PromptTemplateToken[]);

        setTokens(uniqueTokens);

        // Initialize parameters for new tokens
        setTestParameters(prev => {
            const newParams = { ...prev };
            uniqueTokens.forEach(token => {
                if (!(token.name in newParams)) {
                    newParams[token.name] = '';
                }
            });
            return newParams;
        });
    }, [tokens, extractTokens]);

    const handleUserMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setUserMessageTemplate(newText);
        updateTokens(newText, systemMessageTemplate);
    }, [systemMessageTemplate, updateTokens]);

    const handleSystemMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setSystemMessageTemplate(newText);
        updateTokens(userMessageTemplate, newText);
    }, [userMessageTemplate, updateTokens]);

    const handleClose = () => {
        onClose();
    };

    const handleSave = async () => {
        try {
            const templateData: PromptTemplateCreate | PromptTemplateUpdate = {
                name,
                description,
                user_message_template: userMessageTemplate,
                system_message_template: systemMessageTemplate,
                tokens,
                output_schema: outputSchema,
                ...(template?.template_id ? { template_id: template.template_id } : {})
            };

            if (template?.template_id) {
                await updateTemplate(template.template_id, templateData as PromptTemplateUpdate);
            } else {
                const newTemplate = await createTemplate(templateData as PromptTemplateCreate);
                onTemplateChange?.(newTemplate.template_id);
            }
            handleClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save template');
        }
    };

    const handleTest = async () => {
        try {
            setError('');
            setIsTesting(true);
            const testData: PromptTemplateTest = {
                user_message_template: userMessageTemplate,
                system_message_template: systemMessageTemplate,
                tokens,
                output_schema: outputSchema,
                parameters: testParameters
            };
            const result = await testTemplate(template?.template_id || '', testData);
            setTestResult(JSON.stringify(result, null, 2));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to test template');
        } finally {
            setIsTesting(false);
        }
    };

    const handleSchemaChange = (newSchema: Schema) => {
        setOutputSchema(newSchema);
    };

    // Load file names for file values
    useEffect(() => {
        const loadFileNames = async () => {
            const newFileNames: Record<string, string> = {};
            for (const [tokenName, value] of Object.entries(testParameters)) {
                if (tokens.find(t => t.name === tokenName)?.type === 'file' && value) {
                    try {
                        const fileInfo = await fileApi.getFile(value);
                        newFileNames[value] = fileInfo.name;
                    } catch (err) {
                        console.error('Error loading file name:', err);
                    }
                }
            }
            setFileNames(newFileNames);
        };
        loadFileNames();
    }, [testParameters, tokens]);

    const handleFileSelect = (fileId: string) => {
        if (selectedTokenName) {
            setTestParameters(prev => ({
                ...prev,
                [selectedTokenName]: fileId
            }));
            setShowFileSelector(false);
            setSelectedTokenName(null);
        }
    };

    const toggleTestSection = () => {
        setShowTestSection(!showTestSection);
        setTestResult('');
        setError('');
    };

    // Function to generate schema output instructions
    const generateSchemaInstructions = () => {
        if (outputSchema.type !== 'object') return '';

        // Create a simplified schema representation for instructions
        const schemaForInstructions = JSON.stringify(outputSchema, null, 2);

        return `Please respond in valid JSON format using the following schema structure:

${schemaForInstructions}

IMPORTANT: Your response must be properly formatted JSON that follows this schema exactly. Do not include any explanatory text outside the JSON structure, as this will cause parsing errors. Ensure all quotes, brackets, and commas are correctly placed.`;
    };

    // Function to copy schema instructions to clipboard
    const copySchemaInstructions = () => {
        const instructions = generateSchemaInstructions();
        if (instructions) {
            navigator.clipboard.writeText(instructions)
                .then(() => {
                    // Provide visual feedback by temporarily changing the button text
                    const button = document.getElementById('copy-schema-button');
                    if (button) {
                        const originalText = button.textContent;
                        button.textContent = 'Copied!';
                        setTimeout(() => {
                            button.textContent = originalText;
                        }, 2000);
                    }
                    console.log('Schema instructions copied to clipboard');
                })
                .catch(err => {
                    console.error('Failed to copy schema instructions:', err);
                });
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                    {/* Template Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Template Name</label>
                        <input
                            ref={nameInputRef}
                            type="text"
                            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm 
                                    focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2
                                    bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter template name"
                        />
                    </div>

                    {/* Template Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description (Optional)</label>
                        <input
                            type="text"
                            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm 
                                    focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2
                                    bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter template description"
                        />
                    </div>
                </div>

                {/* System Message Template */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">System Message Template (Optional)</label>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                        <textarea
                            className="block w-full border-0 shadow-sm px-3 py-2
                                    focus:border-indigo-500 focus:ring-indigo-500 text-xs
                                    bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            rows={2}
                            value={systemMessageTemplate}
                            onChange={handleSystemMessageChange}
                            placeholder="Enter system message template. You can use {{token}} for string tokens and <<file:token>> for file tokens."
                        />
                    </div>
                </div>

                {/* User Message Template */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">User Message Template</label>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                        <textarea
                            className="block w-full border-0 shadow-sm px-3 py-2
                                    focus:border-indigo-500 focus:ring-indigo-500 text-xs
                                    bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            rows={6}
                            value={userMessageTemplate}
                            onChange={handleUserMessageChange}
                            placeholder="Enter your template text using {{token}} for string tokens and <<file:token>> for file tokens"
                        />
                    </div>
                </div>

                {/* Tokens list */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Tokens</label>
                    <div className="flex flex-wrap gap-1 p-2 bg-gray-50 dark:bg-gray-800 rounded-md min-h-[32px] border border-gray-200 dark:border-gray-700">
                        {tokens.map(token => (
                            <span
                                key={token.name}
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${token.type === 'string'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                                    }`}
                            >
                                {token.name} ({token.type})
                            </span>
                        ))}
                        {tokens.length === 0 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                No tokens detected. Add tokens using {'{{'}<span>token_name</span>{'}}'} or &lt;&lt;file:<span>token_name</span>&gt;&gt; syntax.
                            </span>
                        )}
                    </div>
                </div>

                {/* Output schema editor */}
                <div>
                    <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Output Schema</label>
                        {outputSchema.type === 'object' && (
                            <button
                                id="copy-schema-button"
                                type="button"
                                onClick={copySchemaInstructions}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md 
                                        text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 
                                        hover:bg-indigo-100 dark:hover:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-700
                                        focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                Copy Schema Instructions
                            </button>
                        )}
                    </div>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-gray-50 dark:bg-gray-800">
                        <SchemaEditor
                            schema={outputSchema}
                            onChange={handleSchemaChange}
                            compact={true}
                        />
                    </div>
                </div>

                {/* Test Section Toggle */}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={toggleTestSection}
                        disabled={tokens.length === 0}
                        className={`inline-flex items-center px-3 py-1.5 border text-xs font-medium 
                                rounded-md shadow-sm
                                focus:outline-none focus:ring-1 focus:ring-indigo-500
                                ${tokens.length === 0
                                ? 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
                                : 'border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
                            }`}
                    >
                        {showTestSection ? 'Hide Test Section' : 'Test Template'}
                    </button>
                </div>

                {/* Test Section (Collapsible) */}
                {showTestSection && (
                    <div className="space-y-3 border border-gray-200 dark:border-gray-700 rounded-md p-3 bg-gray-50 dark:bg-gray-800">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Test Parameters</h3>

                        {/* Test Parameters */}
                        <div className="grid grid-cols-2 gap-4">
                            {tokens.map((token, index) => (
                                <div key={token.name} className="mb-2">
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                                        {token.name} ({token.type})
                                    </label>
                                    {token.type === 'file' ? (
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="text"
                                                readOnly
                                                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm 
                                                        focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1.5
                                                        bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                                value={fileNames[testParameters[token.name]] || 'No file selected'}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedTokenName(token.name);
                                                    setShowFileSelector(true);
                                                }}
                                                className="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 
                                                        shadow-sm text-xs leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 
                                                        bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 
                                                        focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            >
                                                Select
                                            </button>
                                        </div>
                                    ) : (
                                        <input
                                            type="text"
                                            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm 
                                                    focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1.5
                                                    bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                            value={testParameters[token.name] || ''}
                                            onChange={(e) => {
                                                const newValue = e.target.value;
                                                setTestParameters(prev => ({
                                                    ...prev,
                                                    [token.name]: newValue
                                                }));
                                            }}
                                            autoFocus={index === 0}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        {tokens.length === 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 p-2">
                                No tokens to test. Add tokens to your template first.
                            </div>
                        )}

                        {/* Test Button */}
                        <div>
                            <button
                                type="button"
                                onClick={handleTest}
                                disabled={isTesting || tokens.length === 0}
                                className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium 
                                        rounded-md shadow-sm text-white
                                        focus:outline-none focus:ring-1 focus:ring-indigo-500
                                        transition-colors duration-200
                                        ${isTesting || tokens.length === 0
                                        ? 'bg-indigo-400 dark:bg-indigo-400 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
                                    }`}
                            >
                                <span className="flex items-center gap-1">
                                    {isTesting && (
                                        <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    )}
                                    {isTesting ? 'Testing...' : 'Run Test'}
                                </span>
                            </button>
                        </div>

                        {/* Test Results */}
                        {testResult && (
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Test Result</h3>
                                <pre className="p-3 bg-white dark:bg-gray-900 rounded-md overflow-auto 
                                            text-gray-900 dark:text-gray-100 text-xs max-h-60 border border-gray-200 dark:border-gray-700">
                                    {testResult}
                                </pre>
                            </div>
                        )}

                        {/* Error message */}
                        {error && (
                            <div className="text-red-600 dark:text-red-400 text-xs p-2 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800/30">
                                {error}
                            </div>
                        )}
                    </div>
                )}

                {/* Save/Cancel Buttons */}
                <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 
                                text-xs font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 
                                bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 
                                focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium 
                                rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 
                                focus:outline-none focus:ring-1 focus:ring-indigo-500
                                dark:bg-indigo-500 dark:hover:bg-indigo-600"
                    >
                        Save
                    </button>
                </div>
            </div>

            {/* File Selector Dialog */}
            {showFileSelector && (
                <Dialog
                    isOpen={showFileSelector}
                    onClose={() => {
                        setShowFileSelector(false);
                        setSelectedTokenName(null);
                    }}
                    title="Select a File"
                    maxWidth="2xl"
                >
                    <div className="p-2">
                        <FileLibrary
                            onFileSelect={handleFileSelect}
                        />
                    </div>
                </Dialog>
            )}
        </div>
    );
};

export default PromptTemplateEditor; 