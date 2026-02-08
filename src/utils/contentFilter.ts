/**
 * Content Filter Utility
 * 
 * Filters profanity and offensive content from user submissions.
 * Uses the bad-words library with custom additions for D&D context.
 */

import { Filter } from 'bad-words';

// Create filter instance
const filter = new Filter();

// Add any custom words to block (optional - the library has a good default list)
// filter.addWords('customBadWord1', 'customBadWord2');

// Remove false positives that might appear in fantasy context (optional)
// filter.removeWords('hell', 'damn'); // These are fine in D&D context

/**
 * Check if text contains profanity
 */
export function containsProfanity(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  return filter.isProfane(text);
}

/**
 * Clean text by replacing profanity with asterisks
 * (Not currently used - we block rather than clean)
 */
export function cleanText(text: string): string {
  if (!text || text.trim().length === 0) return text;
  return filter.clean(text);
}

/**
 * Validate user-submitted content
 * Returns an error message if content is inappropriate, null if OK
 */
export function validateContent(text: string, fieldName: string): string | null {
  if (!text || text.trim().length === 0) return null;
  
  if (containsProfanity(text)) {
    return `Please keep your ${fieldName} family-friendly!`;
  }
  
  return null;
}
