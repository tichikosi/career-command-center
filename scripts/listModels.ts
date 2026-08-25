import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
  const match = envContent.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/);
  const apiKey = match ? match[1].trim() : '';

  if (!apiKey) {
    console.error('No API key found in .env.local');
    return;
  }

  try {
    const modelsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await modelsResponse.json();
    if (data.models) {
      console.log('--- Official Gemini API Models Found ---');
      for (const m of data.models) {
        if (m.name.includes('flash') || m.name.includes('gemini-2') || m.name.includes('gemini-3')) {
          console.log(`Model: ${m.name.replace('models/', '')} | displayName: ${m.displayName} | description: ${m.description?.slice(0, 80)}...`);
        }
      }
    } else {
      console.log('API response:', JSON.stringify(data, null, 2));
    }
  } catch (err: unknown) {
    console.error('Error listing models:', err instanceof Error ? err.message : String(err));
  }
}

main();
