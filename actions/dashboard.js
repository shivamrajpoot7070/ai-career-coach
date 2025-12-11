"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ------------------------------
// Gemini Setup
// ------------------------------
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ------------------------------
// Retry Wrapper
// ------------------------------
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
      console.warn(`Gemini retry... attempts left: ${retries}`);
      await new Promise(res => setTimeout(res, delay));
      return retryAI(fn, retries - 1, delay * 1.5);
    }

    throw err;
  }
}

// ------------------------------
// Fallback Model Chain
// ------------------------------
async function generateWithFallback(prompt) {
  const models = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-flash-latest"];

  for (const m of models) {
    try {
      console.log(`Trying model: ${m}`);
      const model = genAI.getGenerativeModel({ model: m });

      const result = await retryAI(() => model.generateContent(prompt));
      const text = result.response.text().trim();

      const cleaned = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      return JSON.parse(cleaned);
    } catch (err) {
      console.error(`Model ${m} failed →`, err.message);
    }
  }

  throw new Error("All Gemini models failed.");
}

// ------------------------------
// SAFE Insight Generator
// ------------------------------
export const generateAIInsights = async (industry) => {
  const prompt = `
    Analyze the ${industry} industry and return ONLY this JSON:
    {
      "salaryRanges": [{ "role": "string", "min": number, "max": number, "median": number, "location": "string" }],
      "growthRate": number,
      "demandLevel": "High" | "Medium" | "Low",
      "topSkills": ["s1","s2","s3","s4","s5"],
      "marketOutlook": "Positive" | "Neutral" | "Negative",
      "keyTrends": ["t1","t2","t3","t4","t5"],
      "recommendedSkills": ["s1","s2","s3","s4","s5"]
    }
    No markdown. No extra text.
  `;

  return await generateWithFallback(prompt);
};

// ===================================================================
// FIXED updateUser — AI OUTSIDE transaction, DB writes INSIDE transaction
// ===================================================================
export async function updateUser(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) throw new Error("User not found");

  try {
    // STEP 1 — Check if insight exists (FAST)
    let existingInsight = await db.industryInsight.findUnique({
      where: { industry: data.industry },
    });

    // STEP 2 — AI CALL OUTSIDE transaction (IMPORTANT!!)
    let aiInsights = null;
    if (!existingInsight) {
      aiInsights = await generateAIInsights(data.industry);
    }

    // STEP 3 — SAFE DB writes (super fast)
    const result = await db.$transaction(async (tx) => {
      let finalInsight = existingInsight;

      if (!existingInsight) {
        finalInsight = await tx.industryInsight.create({
          data: {
            industry: data.industry,
            ...aiInsights,
            nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      }

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          industry: data.industry,
          experience: data.experience,
          bio: data.bio,
          skills: data.skills,
        },
      });

      return { updatedUser };
    });

    return result.updatedUser;
  } catch (error) {
    console.error("Error updating user and industry:", error);
    throw new Error("Failed to update profile");
  }
}

// ------------------------------
// ONBOARDING STATUS
// ------------------------------
export async function getUserOnboardingStatus() {
  const { userId } = await auth();
  if (!userId) return { isOnboarded: false };

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { industry: true },
  });

  return { isOnboarded: !!user?.industry };
}

// ------------------------------
// FETCH INSIGHTS
// ------------------------------
export async function getIndustryInsights() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: { industryInsight: true },
  });

  if (!user) throw new Error("User not found");

  if (!user.industryInsight) {
    const insights = await generateAIInsights(user.industry);

    return await db.industryInsight.create({
      data: {
        industry: user.industry,
        ...insights,
        nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  return user.industryInsight;
}
