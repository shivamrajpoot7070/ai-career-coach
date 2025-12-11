"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

// ------------------------------
// Gemini Setup + Retry Logic
// ------------------------------
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Generic retry wrapper (same as interview.js & cover-letter.js)
async function retryAI(fn, retries = 5, delay = 700) {
  try {
    return await fn();
  } catch (err) {
    const retryable =
      err?.status === 503 ||
      err?.status === 429 ||
      err?.status === 500 ||
      err?.statusText === "Service Unavailable";

    if (retryable && retries > 0) {
      console.warn(`Retrying AI... attempts left: ${retries}`);
      await new Promise((res) => setTimeout(res, delay));
      return retryAI(fn, retries - 1, delay * 1.5);
    }
    throw err;
  }
}

// Fallback chain
async function generateWithFallback(prompt) {
  const models = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-flash-latest",
  ];

  for (const m of models) {
    try {
      console.log(`Trying model: ${m}`);

      const model = genAI.getGenerativeModel({ model: m });

      const result = await retryAI(() => model.generateContent(prompt));

      const text = result.response.text().trim();

      const cleaned = text
        .replace(/```/g, "")
        .replace(/```markdown/g, "")
        .trim();

      return cleaned;
    } catch (err) {
      console.error(`Model ${m} failed ->`, err.message);
      continue;
    }
  }

  throw new Error("All Gemini models failed.");
}

// ------------------------------
// SAVE RESUME
// ------------------------------
export async function saveResume(content) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const resume = await db.resume.upsert({
      where: {
        userId: user.id,
      },
      update: {
        content,
      },
      create: {
        userId: user.id,
        content,
      },
    });

    revalidatePath("/resume");

    return resume;
  } catch (error) {
    console.error("Error saving resume:", error);
    throw new Error("Failed to save resume");
  }
}

// ------------------------------
// GET RESUME
// ------------------------------
export async function getResume() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.resume.findUnique({
    where: {
      userId: user.id,
    },
  });
}

// ------------------------------
// IMPROVE RESUME WITH AI
// ------------------------------
export async function improveWithAI({ current, type }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: { industryInsight: true },
  });

  if (!user) throw new Error("User not found");

  const prompt = `
    Improve this ${type} for a ${user.industry} professional.
    Make it impactful, metrics-driven, concise, and achievement-focused.

    Current content:
    "${current}"

    Requirements:
    - Use action verbs
    - Add measurable results where possible
    - Highlight technical skills
    - Keep to a single polished paragraph
    - No extra explanation text
  `;

  try {
    const improved = await generateWithFallback(prompt);
    return improved;
  } catch (error) {
    console.error("Error improving resume section:", error);
    throw new Error("Failed to improve content");
  }
}
