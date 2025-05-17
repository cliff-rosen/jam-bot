import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { PromptTemplateToken } from '../types/prompts';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts variable names from template text by looking for text between double curly braces.
 * For example, "Hello {{name}}, how are you {{time}}?" returns ["name", "time"]
 */
export function extractTokens(text: string): PromptTemplateToken[] {
  const regularTokenRegex = /{{([^}]+)}}/g;
  const fileTokenRegex = /<<file:([^>]+)>>/g;
  const tokens: PromptTemplateToken[] = [];

  // Extract regular string tokens
  const regularMatches = text.matchAll(regularTokenRegex);
  for (const match of regularMatches) {
    tokens.push({
      name: match[1],
      type: 'string'
    });
  }

  // Extract file tokens
  const fileMatches = text.matchAll(fileTokenRegex);
  for (const match of fileMatches) {
    tokens.push({
      name: match[1],
      type: 'file'
    });
  }

  // Remove duplicates by name
  return Array.from(new Set(tokens.map(t => t.name))).map(name =>
    tokens.find(t => t.name === name)!
  );
} 