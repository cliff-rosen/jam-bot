# WorkflowEngine Tests

This directory contains tests for the `WorkflowEngine` class in the workflow system.

## applyOutputToVariable Tests

The `workflowEngine.applyOutputToVariable.test.ts` file contains comprehensive tests for the `applyOutputToVariable` method, which is responsible for applying tool output values to workflow variables based on mapping operations.

### Test Coverage

The tests cover the following scenarios:

#### String Variable Tests
- String to String (ASSIGN and APPEND)
- String Array to String (ASSIGN and APPEND)
- Object to String (ASSIGN and APPEND)
- Object Array to String (ASSIGN and APPEND)

#### String Array Variable Tests
- String to String Array (ASSIGN and APPEND)
- String Array to String Array (ASSIGN and APPEND)
- Object to String Array (ASSIGN and APPEND)
- Object Array to String Array (ASSIGN and APPEND)

#### Edge Cases
- Simple string mapping (non-object)
- Invalid enhanced mapping (missing properties)
- Null/undefined variable values
- Unknown operation types

### Running the Tests

To run these tests, use the following command from the project root:

```bash
# Run all tests
npm test

# Run specific tests for this method
npm test -- -t "WorkflowEngine.applyOutputToVariable"
```

### Notes

- The tests assume certain behaviors for type conversions (e.g., objects to JSON strings, arrays to joined strings).
- The `APPEND_DELIMITER` constant in the test file should match the delimiter used in the actual implementation.
- The private method is accessed for testing purposes using TypeScript's indexing syntax and the `@ts-ignore` comment.

## Potential Improvements

1. Add tests for more variable types (number, boolean, etc.)
2. Test with nested objects and arrays
3. Test with edge cases like circular references in objects 