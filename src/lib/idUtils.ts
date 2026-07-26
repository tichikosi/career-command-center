/**
 * Centralized client-only ID helper.
 * Uses crypto.randomUUID() where supported, with a fallback.
 * Must ONLY be called in response to explicit user actions.
 * NEVER call during SSR or render.
 */
export function generateId(prefix = 'id'): string {
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return `${prefix}-${timestamp}-${random}`;
}
