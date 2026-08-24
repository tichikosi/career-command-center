import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { getGeminiModel, getGeminiFallbackModel } from '../src/lib/server/geminiConfig';
import { sanitizeErrorMessage } from '../src/lib/server/geminiRetry';

// Load environment variables from .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

async function verifyLiveCall() {
  console.log('================================================================');
  console.log(' OFFICIAL GOOGLE GEMINI API LIVE AUTHENTICATION & MODEL VERIFIER');
  console.log('================================================================\n');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    console.log('❌ Result: FAILED - GEMINI_API_KEY is empty or not configured.');
    return;
  }

  const primaryModel = getGeminiModel();
  const failoverModel = getGeminiFallbackModel();

  console.log(`• Authentication Status : Configured (${apiKey.length} chars)`);
  console.log(`• Primary Live Model    : ${primaryModel}`);
  console.log(`• Failover Live Model   : ${failoverModel}`);
  console.log(`• Fallback Engine       : STRICTLY DISABLED (Live-only testing)\n`);

  const client = new GoogleGenAI({ apiKey });

  // A. Query Authenticated Model Catalog
  console.log('--- A. Authenticated Model Catalog Query (client.models.list) ---');
  try {
    const listResult = await client.models.list();
    console.log('✅ Model Catalog Query  : SUCCESS');
    const availableFlashModels: string[] = [];
    if (listResult && typeof listResult[Symbol.asyncIterator] === 'function') {
      for await (const m of listResult) {
        if (m.name && (m.name.includes('flash') || m.name.includes('gemini-3') || m.name.includes('gemini-2.5'))) {
          const modelId = m.name.replace('models/', '');
          availableFlashModels.push(modelId);
          console.log(`  - \x1b[36m${modelId}\x1b[0m (${m.displayName || 'Official Gemini Model'})`);
        }
      }
    }
    console.log(`• Relevant Models Count : ${availableFlashModels.length} models detected\n`);
  } catch (err: unknown) {
    console.log(`❌ Model Catalog Query  : FAILED - ${sanitizeErrorMessage(err)}\n`);
  }

  // B. Primary Model Direct Generation
  console.log(`--- B. Primary Model Live Generation [${primaryModel}] ---`);
  const primaryStart = Date.now();
  try {
    const response = await client.models.generateContent({
      model: primaryModel,
      contents: 'Respond with valid JSON: {"model": "' + primaryModel + '", "status": "operational", "timestamp": "' + new Date().toISOString() + '"}',
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });
    const primaryLatency = Date.now() - primaryStart;
    console.log(`✅ Primary Model        : ${primaryModel}`);
    console.log(`✅ Primary Result       : SUCCESS (${primaryLatency}ms)`);
    console.log(`   Response             : ${response.text?.trim()}\n`);
  } catch (err: unknown) {
    const primaryLatency = Date.now() - primaryStart;
    console.log(`❌ Primary Model        : ${primaryModel}`);
    console.log(`❌ Primary Result       : FAILED (${primaryLatency}ms)`);
    console.log(`   Error                : ${sanitizeErrorMessage(err)}\n`);
  }

  // C. Failover Model Direct Generation
  console.log(`--- C. Failover Model Live Generation [${failoverModel}] ---`);
  const failoverStart = Date.now();
  try {
    const response = await client.models.generateContent({
      model: failoverModel,
      contents: 'Respond with valid JSON: {"model": "' + failoverModel + '", "status": "operational", "timestamp": "' + new Date().toISOString() + '"}',
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });
    const failoverLatency = Date.now() - failoverStart;
    console.log(`✅ Failover Model       : ${failoverModel}`);
    console.log(`✅ Failover Result      : SUCCESS (${failoverLatency}ms)`);
    console.log(`   Response             : ${response.text?.trim()}\n`);
  } catch (err: unknown) {
    const failoverLatency = Date.now() - failoverStart;
    console.log(`❌ Failover Model       : ${failoverModel}`);
    console.log(`❌ Failover Result      : FAILED (${failoverLatency}ms)`);
    console.log(`   Error                : ${sanitizeErrorMessage(err)}\n`);
  }
}

verifyLiveCall();
