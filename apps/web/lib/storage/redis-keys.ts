/**
 * Centralized Redis key definitions
 *
 * This file contains all Redis key generation functions to ensure
 * consistency across the application and avoid typos.
 */

/**
 * Redis key for storing segment contact counts
 *
 * Format: segments:{workspaceId}:contacts
 * Type: Hash
 * Fields: segment ID -> contact count
 * Expiration: 1 hour
 */
export function getSegmentContactsKey(workspaceId: string): string {
  return `segments:${workspaceId}:contacts`;
}