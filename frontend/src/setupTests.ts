import '@testing-library/jest-dom';

// Mock console.warn to avoid cluttering test output
const originalWarn = console.warn;
console.warn = (...args) => {
    // Filter out specific warnings if needed
    if (args[0]?.includes('test warning to ignore')) {
        return;
    }
    originalWarn(...args);
}; 