"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ------------------------------
// Gemini Setup
// ------------------------------
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Generic Retry Wrapper
async function retryAI(fn, retries = 5, delay = 700) {
  try {
    return await fn();
  } catch (err) {
    const retryable =
      err?.status === 503 ||
      err?.status === 429 ||
      err?.status === 500 ||
      err?.statusText === "Service Unavailable";

    if (retries > 0 && retryable) {
      console.warn(`Gemini retry... attempts left: ${retries}`);
      await new Promise((res) => setTimeout(res, delay));
      return retryAI(fn, retries - 1, delay * 1.5);
    }

    throw err;
  }
}

// Fallback model chain
async function generateWithFallback(prompt) {

  const models = ["gemini-2.5-pro", "gemini-1.5-pro", "gemini-1.5-flash"];

  for (const m of models) {
    try {
      console.log(`Trying model: ${m}`);

      const model = genAI.getGenerativeModel({ model: m });

      const result = await retryAI(() =>
        model.generateContent(prompt)
      );

      const text = result.response.text().trim();

      const cleaned = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      return JSON.parse(cleaned);
    } 
    catch (err) {
      console.error(`Model ${m} failed →`, err.message);
      continue; // try next model
    }
  }

  throw new Error("All Gemini models failed.");
}

// -----------------------------------------
// Final Insight Generator (Safe for Prod)
// -----------------------------------------
export const generateAIInsights = async (industry) => {
  const prompt = `
    Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON:
    {
      "salaryRanges": [
        { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
      ],
      "growthRate": number,
      "demandLevel": "High" | "Medium" | "Low",
      "topSkills": ["skill1", "skill2"],
      "marketOutlook": "Positive" | "Neutral" | "Negative",
      "keyTrends": ["trend1", "trend2"],
      "recommendedSkills": ["skill1", "skill2"]
    }

    Return ONLY valid JSON.
    No markdown.
    No code blocks.
    Include at least 5 roles, 5 skills, 5 trends.
  `;

  return await generateWithFallback(prompt);
};

// --------------------------------------------------
// UPDATE USER — With safe Gemini + transaction
// --------------------------------------------------

export async function updateUser(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    // -------------------------------------------------
    // 1. Check if insight exists BEFORE transaction
    //    The AI call must happen outside the transaction
    // -------------------------------------------------
    let industryInsight = await db.industryInsight.findUnique({
      where: { industry: data.industry },
    });

    let insights;

    if (!industryInsight) {
      // SAFE: AI call outside transaction
      insights = await generateAIInsights(data.industry);
    }

    // -------------------------------------------------
    // 2. Now run DB writes inside a transaction
    // -------------------------------------------------

    const result = await db.$transaction(async (tx) => {
      let newInsight = industryInsight;

      if (!industryInsight) {

        newInsight = await tx.industryInsight.create({
          data: {
            industry: data.industry,
            ...insights,
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

      return { updatedUser, newInsight };
    });

    return result.updatedUser;
  } 
  catch (error) {
    console.error("Error updating user and industry:", error);
    throw new Error("Failed to update profile");
  }
}


// --------------------------------------------------
// FIXED — SAFE ONBOARDING STATUS CHECK
// --------------------------------------------------

export async function getUserOnboardingStatus() {
  const { userId } = await auth();

  // DO NOT THROW — allows onboarding after sign-in
  if (!userId) {
    return { isOnboarded: false };
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { industry: true },
  });

  return {
    isOnboarded: !!user?.industry,
  };
}

// --------------------------------------------------
// FETCH INDUSTRY INSIGHTS
// --------------------------------------------------
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
