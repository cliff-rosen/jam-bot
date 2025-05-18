import React from 'react';
import { Tool } from '../types/index';

interface ToolDetailsProps {
    tool: Tool;
}

const ToolDetails: React.FC<ToolDetailsProps> = ({ tool }) => {
    return (
        <>
            {/* Tool Row */}
            <tr className="bg-gray-50 dark:bg-gray-700/50">
                <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{tool.name}</div>
                </td>
                <td className="px-4 py-2">
                    <div className="text-sm text-gray-600 dark:text-gray-400">{tool.description}</div>
                </td>
                <td className="px-4 py-2">
                    <div className="space-y-1">
                        {tool.inputs?.map((input, i) => (
                            <div key={i} className="text-xs text-gray-600 dark:text-gray-400">
                                <span className="font-medium">{input.name}</span>
                                <span className="text-gray-500 dark:text-gray-500 ml-1">
                                    ({input.type}{input.is_array ? '[]' : ''})
                                </span>
                            </div>
                        ))}
                        {(!tool.inputs || tool.inputs.length === 0) && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 italic">No inputs</div>
                        )}
                    </div>
                </td>
                <td className="px-4 py-2">
                    <div className="space-y-1">
                        {tool.outputs?.map((output, i) => (
                            <div key={i} className="text-xs text-gray-600 dark:text-gray-400">
                                <span className="font-medium">{output.name}</span>
                                <span className="text-gray-500 dark:text-gray-500 ml-1">
                                    ({output.type}{output.is_array ? '[]' : ''})
                                </span>
                            </div>
                        ))}
                        {(!tool.outputs || tool.outputs.length === 0) && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 italic">No outputs</div>
                        )}
                    </div>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {tool.category}
                    </span>
                </td>
            </tr>

            {/* Step Rows */}
            {tool.steps?.map((step, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-2 whitespace-nowrap pl-8">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{step.name}</div>
                    </td>
                    <td className="px-4 py-2">
                        <div className="text-sm text-gray-600 dark:text-gray-400">{step.description}</div>
                    </td>
                    <td className="px-4 py-2">
                        <div className="space-y-1">
                            {step.inputs.map((input, i) => (
                                <div key={i} className="text-xs text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">{input.name}</span>
                                    <span className="text-gray-500 dark:text-gray-500 ml-1">
                                        ({input.type}{input.is_array ? '[]' : ''})
                                    </span>
                                </div>
                            ))}
                        </div>
                    </td>
                    <td className="px-4 py-2">
                        <div className="space-y-1">
                            {step.outputs.map((output, i) => (
                                <div key={i} className="text-xs text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">{output.name}</span>
                                    <span className="text-gray-500 dark:text-gray-500 ml-1">
                                        ({output.type}{output.is_array ? '[]' : ''})
                                    </span>
                                </div>
                            ))}
                        </div>
                    </td>
                    <td className="px-4 py-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400 italic">Step {index + 1}</div>
                    </td>
                </tr>
            ))}
        </>
    );
};

export default ToolDetails; 