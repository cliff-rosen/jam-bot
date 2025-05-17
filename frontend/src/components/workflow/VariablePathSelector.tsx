import React, { useState, useRef, useEffect } from 'react';
import { WorkflowVariable } from '@/types/workflows';
import { Schema } from '@/types/schema';
import { formatVariablePath, renderVariablePathsWithProperties } from '@/lib/utils/variableUIUtils';

interface VariablePathSelectorProps {
    variables: WorkflowVariable[];
    value: string;
    onChange: (value: string) => void;
    targetSchema?: Schema | null;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

const VariablePathSelector: React.FC<VariablePathSelectorProps> = ({
    variables = [],
    value,
    onChange,
    targetSchema = null,
    placeholder = 'Select variable',
    className = '',
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const dropdownContentRef = useRef<HTMLDivElement>(null);
    const [dropdownStyles, setDropdownStyles] = useState<React.CSSProperties>({});

    // Calculate and update dropdown position when opening
    useEffect(() => {
        if (!isOpen) return;

        // Use requestAnimationFrame to ensure DOM is fully updated
        const updatePosition = () => {
            if (!dropdownRef.current) return;

            const rect = dropdownRef.current.getBoundingClientRect();
            const width = dropdownRef.current.offsetWidth;
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;

            // Initial styles
            const styles: React.CSSProperties = {
                width: `${width}px`,
                left: `${rect.left}px`,
            };

            // Check if dropdown would go off-screen to the right
            if (rect.left + width > viewportWidth) {
                styles.left = `${viewportWidth - width - 10}px`;
            }

            // Measure dropdown height after rendering
            if (dropdownContentRef.current) {
                const dropdownHeight = dropdownContentRef.current.scrollHeight;
                const spaceBelow = viewportHeight - rect.bottom;
                const spaceAbove = rect.top;

                // Decide whether to show above or below
                if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
                    setDropdownPosition('top');
                    styles.bottom = `${viewportHeight - rect.top}px`;
                    styles.maxHeight = `${Math.min(spaceAbove - 10, 300)}px`;
                } else {
                    setDropdownPosition('bottom');
                    styles.top = `${rect.bottom}px`;
                    styles.maxHeight = `${Math.min(spaceBelow - 10, 300)}px`;
                }
            }

            setDropdownStyles(styles);
        };

        // Update position immediately and after a short delay to account for any layout shifts
        updatePosition();
        const timeoutId = setTimeout(updatePosition, 50);

        // Add resize listener
        window.addEventListener('resize', updatePosition);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleVariablePathClick = (path: string) => {
        onChange(path);
        setIsOpen(false);
    };

    const baseClasses = `relative w-full px-3 py-2 border rounded-md text-sm 
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        ${disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-white dark:bg-gray-800 cursor-pointer'}
                        ${className}`;

    return (
        <div className="relative" ref={dropdownRef}>
            <div
                className={baseClasses}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <div className="flex items-center justify-between">
                    <span className={value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
                        {value ? formatVariablePath(value) : placeholder}
                    </span>
                    <svg
                        className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                        />
                    </svg>
                </div>
            </div>

            {isOpen && (
                <div
                    ref={dropdownContentRef}
                    className="fixed z-[100] bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 overflow-y-auto"
                    style={dropdownStyles}
                >
                    <div className="py-1">
                        {!variables || variables.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                                No variables available
                            </div>
                        ) : (
                            variables.flatMap(variable =>
                                renderVariablePathsWithProperties(
                                    variable,
                                    targetSchema,
                                    handleVariablePathClick
                                )
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default VariablePathSelector; 