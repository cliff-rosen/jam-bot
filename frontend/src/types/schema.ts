/**
 * DEPRECATED
 *
 * This file is deprecated and will be removed.
 * All types should be imported from the new modular files in this directory:
 * - base.ts
 * - asset.ts
 * - resource.ts
 * - tool.ts
 * - workflow.ts
 */

/**
 * Unified Schema System - Deprecated
 *
 * This file is the old, monolithic schema definition for the frontend. It is
 * being kept temporarily for backwards compatibility during the refactor but
 * will be removed. New code should import from the modular files in this
 * directory (e.g., `import { Asset } from './asset'`).
 *
 * This module now re-exports the primary interfaces from the new schema files
 * to avoid breaking existing imports immediately.
 */

// Re-export from base.ts
export * from './base';

// Re-export from asset.ts
export * from './asset';

// Re-export from tool.ts (which includes temporary Resource definitions)
export * from './tool';

// Re-export from workflow.ts
export * from './workflow';

// Re-export with aliases to avoid naming conflicts during transition.
export { type Asset as DeprecatedAsset } from './asset';
export { type Resource as DeprecatedResource } from './tool';
export { type ToolDefinition as DeprecatedToolDefinition } from './tool';
// ... and so on for all conflicting types
