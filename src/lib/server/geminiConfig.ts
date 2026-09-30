import type { GoogleGenAI } from '@google/genai';

/**
 * Server-only Gemini Configuration and Client Factory.
 * NEVER import this file from client components.
 */

// Production Primary Model: Gemini 3.8 Flash
export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

// Production Failover Model: Gemini 3.7 Flash
export const DEFAULT_GEMINI_FALLBACK_MODEL = 'gemini-3.7-flash';

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

export function getGeminiFallbackModel(): string {
  return process.env.GEMINI_FAILOVER_MODEL || process.env.GEMINI_FALLBACK_MODEL || DEFAULT_GEMINI_FALLBACK_MODEL;
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
}

let geminiClientInstance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  if (!geminiClientInstance) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GoogleGenAI: GenAIClass } = require('@google/genai');
    geminiClientInstance = new GenAIClass({ apiKey });
  }

  return geminiClientInstance!;
}

// Reset instance helper (useful for testing or config changes)
export function resetGeminiClient(): void {
  geminiClientInstance = null;
}
