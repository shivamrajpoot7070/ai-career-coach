
"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";


// ENV format: GEMINI_API_KEYS="key1,key2,key3"
const API_KEYS = process.env.GEMINI_API_KEYS?.split(",").map(k => k.trim()) ?? [];

if (API_KEYS.length === 0) {
  console.error("No Gemini keys found in GEMINI_API_KEYS");
}

function getClient(apiKey) {
    return new GoogleGenerativeAI(apiKey);
}

/* ------------------------------------------------------
   RETRY WRAPPER (handles overload, 429, etc.)
------------------------------------------------------ */

async function retryAI(fn, retries = 4, delay = 500) {
  try {
    return await fn();
  } 
  catch (err) {
    const retryable =
      err?.status === 429 ||
      err?.status === 503 ||
      err?.status === 500 ||
      err?.statusText === "Service Unavailable";

    if (retryable && retries > 0) {
      console.log(`🔄 Retry attempt left: ${retries}`);
      await new Promise(res => setTimeout(res, delay));
      return retryAI(fn, retries - 1, delay * 1.5);
    }
    throw err;
  }
}

/* ------------------------------------------------------
   MAIN FALLBACK ENGINE (keys + models)
------------------------------------------------------ */
export async function generateAI(prompt, { expectJson = false } = {}) {
  const models = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-flash-latest"
  ];

  for (const apiKey of API_KEYS) {
    
    const client = getClient(apiKey);

    for (const modelName of models) {
      try {
        console.log(` Using model=${modelName}, key=${apiKey.slice(0, 6)}...`);

        const model = client.getGenerativeModel({ model: modelName });

        const result = await retryAI(() =>
          model.generateContent(prompt)
        );

        const text = result.response.text().trim();
        const cleaned = text
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();

        return expectJson ? JSON.parse(cleaned) : cleaned;
      } 
      catch (err) {
        console.error(
          ` Failed model=${modelName} key=${apiKey.slice(0, 6)} →`,
          err?.message || err
        );
        continue;
      }
    }
  }

  throw new Error("All Gemini API keys + models failed.");
}
