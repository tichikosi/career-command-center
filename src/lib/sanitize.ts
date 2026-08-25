export interface SanitizationResult {
  isValid: boolean;
  sanitizedText: string;
  error?: string;
  wordCount: number;
}

/**
 * Plain-text normalization for the Version 1 demo.
 * Note: React text node rendering provides primary layout safety against unsanitized HTML/JS nodes.
 */
export function sanitizeInput(rawText: string): SanitizationResult {
  if (!rawText || typeof rawText !== 'string') {
    return {
      isValid: false,
      sanitizedText: '',
      error: 'Job description text cannot be empty.',
      wordCount: 0,
    };
  }

  // 1. Remove script, style, and HTML tags
  let cleaned = rawText
    .replace(/<script\b[^<]*>([\s\S]*?)<\/script>/gi, '')
    .replace(/<style\b[^<]*>([\s\S]*?)<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ');

  // 2. Normalize whitespace while preserving line breaks
  cleaned = cleaned
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/\r/g, '')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();

  // 3. Check character ceiling (15,000 max)
  if (cleaned.length > 15000) {
    cleaned = cleaned.substring(0, 15000);
  }

  // 4. Calculate word count
  const words = cleaned.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  // 5. Check minimum word count boundary (50 words)
  if (wordCount < 50) {
    return {
      isValid: false,
      sanitizedText: cleaned,
      error: `Job description must contain at least 50 words for analysis (currently ${wordCount} words).`,
      wordCount,
    };
  }

  return {
    isValid: true,
    sanitizedText: cleaned,
    wordCount,
  };
}
