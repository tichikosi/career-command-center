import zlib from 'zlib';

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
  isExtracted: boolean;
}

/**
 * Server-only PDF text extractor using pure Node.js zlib decompression and text stream operator parsing.
 * Extracts text from PDF buffers without external binaries.
 */
export function extractTextFromPdfBuffer(buffer: Buffer): PdfExtractionResult {
  if (!buffer || buffer.length === 0) {
    return { text: '', pageCount: 0, isExtracted: false };
  }

  let combinedText = '';
  let pageCount = 0;

  // Approximate page count via /Type /Page objects
  const bufferString = buffer.toString('latin1');
  const pageMatches = bufferString.match(/\/Type\s*\/Page\b/g);
  if (pageMatches) {
    pageCount = pageMatches.length;
  }

  // Find all stream objects in PDF
  let searchIdx = 0;
  while (searchIdx < buffer.length) {
    const streamStartKeyword = Buffer.from('stream');
    const startIdx = buffer.indexOf(streamStartKeyword, searchIdx);
    if (startIdx === -1) break;

    // Content starts after "stream" keyword followed by CR/LF
    let contentStart = startIdx + 6;
    if (buffer[contentStart] === 0x0d && buffer[contentStart + 1] === 0x0a) {
      contentStart += 2;
    } else if (buffer[contentStart] === 0x0a || buffer[contentStart] === 0x0d) {
      contentStart += 1;
    }

    const endstreamKeyword = Buffer.from('endstream');
    const endIdx = buffer.indexOf(endstreamKeyword, contentStart);
    if (endIdx === -1) break;

    searchIdx = endIdx + 9;

    const streamData = buffer.subarray(contentStart, endIdx);
    let decompressed: Buffer | null = null;

    // Try standard FlateDecode inflation
    try {
      decompressed = zlib.inflateSync(streamData);
    } catch {
      try {
        decompressed = zlib.inflateRawSync(streamData);
      } catch {
        // Fall back to uncompressed stream
        decompressed = streamData;
      }
    }

    if (decompressed) {
      const streamText = extractTextFromPdfStream(decompressed);
      if (streamText.trim().length > 0) {
        combinedText += streamText + '\n';
      }
    }
  }

  // If stream-based extraction yielded nothing, inspect text tokens directly
  if (combinedText.trim().length === 0) {
    combinedText = extractTextFromRawPdfString(bufferString);
  }

  // Clean and normalize extracted text
  const cleanText = combinedText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+\n/g, '\n\n')
    .trim();

  const isExtracted = cleanText.length >= 20 && /[a-zA-Z]{3,}/.test(cleanText);

  return {
    text: cleanText,
    pageCount: pageCount || (isExtracted ? 1 : 0),
    isExtracted,
  };
}

function extractTextFromPdfStream(streamBuf: Buffer): string {
  const content = streamBuf.toString('latin1');
  const lines: string[] = [];

  // Match BT (Begin Text) ... ET (End Text) blocks
  const btEtRegex = /BT([\s\S]*?)ET/g;
  let btMatch;

  while ((btMatch = btEtRegex.exec(content)) !== null) {
    const textBlock = btMatch[1];
    let currentLine = '';

    // Tokenize text drawing operators and line breaks
    const tokens = textBlock.match(/\[([\s\S]*?)\]\s*TJ|\((.*?)\)\s*Tj|<([0-9a-fA-F]+)>\s*Tj|(\b(?:T\*|Td|TD)\b)|\((.*?)\)\s*['"]/g);

    if (tokens) {
      for (const token of tokens) {
        if (token === 'T*' || /\b(?:Td|TD)\b/.test(token)) {
          if (currentLine.trim()) {
            lines.push(currentLine.trim());
            currentLine = '';
          }
          continue;
        }

        // TJ array: [ (string1) -120 (string2) ] TJ
        const tjArrayMatch = token.match(/\[([\s\S]*?)\]\s*TJ/);
        if (tjArrayMatch) {
          const inner = tjArrayMatch[1];
          const innerParts = inner.match(/\((.*?)\)|<([0-9a-fA-F]+)>/g);
          if (innerParts) {
            for (const part of innerParts) {
              if (part.startsWith('(') && part.endsWith(')')) {
                currentLine += unescapePdfString(part.slice(1, -1));
              } else if (part.startsWith('<') && part.endsWith('>')) {
                currentLine += decodeHexPdfString(part.slice(1, -1));
              }
            }
          }
          continue;
        }

        // Tj string: (string) Tj
        const tjMatch = token.match(/\((.*?)\)\s*Tj/);
        if (tjMatch) {
          currentLine += unescapePdfString(tjMatch[1]);
          continue;
        }

        // Hex Tj string: <00410042> Tj
        const hexMatch = token.match(/<([0-9a-fA-F]+)>\s*Tj/);
        if (hexMatch) {
          currentLine += decodeHexPdfString(hexMatch[1]);
          continue;
        }

        // Single / double quote operator: (string) '
        const quoteMatch = token.match(/\((.*?)\)\s*['"]/);
        if (quoteMatch) {
          if (currentLine.trim()) {
            lines.push(currentLine.trim());
          }
          currentLine = unescapePdfString(quoteMatch[1]);
          continue;
        }
      }
    }

    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }
  }

  return lines.join('\n');
}

function extractTextFromRawPdfString(raw: string): string {
  const matches = raw.match(/\(([^()]{3,})\)\s*(?:Tj|TJ|['"])/g);
  if (!matches) return '';

  const results: string[] = [];
  for (const m of matches) {
    const textMatch = m.match(/\(([^()]+)\)/);
    if (textMatch && textMatch[1]) {
      const decoded = unescapePdfString(textMatch[1]).trim();
      if (decoded.length > 0) {
        results.push(decoded);
      }
    }
  }

  return results.join('\n');
}

function unescapePdfString(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\([0-7]{1,3})/g, (_, oct) => {
      try {
        return String.fromCharCode(parseInt(oct, 8));
      } catch {
        return '';
      }
    });
}

function decodeHexPdfString(hex: string): string {
  let result = '';
  // UTF-16BE detection (starts with FEFF)
  if (hex.length % 4 === 0 && hex.length >= 4) {
    for (let i = 0; i < hex.length; i += 4) {
      const code = parseInt(hex.substring(i, i + 4), 16);
      if (code !== 0xfeff && !isNaN(code) && code > 0) {
        result += String.fromCharCode(code);
      }
    }
    if (result.trim().length > 0) return result;
  }
  for (let i = 0; i < hex.length; i += 2) {
    const code = parseInt(hex.substring(i, i + 2), 16);
    if (!isNaN(code) && code > 0) {
      result += String.fromCharCode(code);
    }
  }
  return result;
}
