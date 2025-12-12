"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { generateAI } from "@/lib/gemini"; // 🔥 unified multi-key + fallback AI engine

/* -------------------------------------------------------
   GENERATE INDUSTRY INSIGHTS USING SHARED AI ENGINE
-------------------------------------------------------- */
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

  const raw = await generateAI(prompt); // Uses key rotation & fallback automatically
  return JSON.parse(raw);
};

/* -------------------------------------------------------
   UPDATE USER (AI outside transaction, safe db writes)
-------------------------------------------------------- */
export async function updateUser(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    // STEP 1 — Check if insights already exist
    let industryInsight = await db.industryInsight.findUnique({
      where: { industry: data.industry },
    });

    // STEP 2 — If not, call AI OUTSIDE transaction
    let insights = null;
    if (!industryInsight) {
      insights = await generateAIInsights(data.industry);
    }

    // STEP 3 — Fast DB writes inside transaction
    const result = await db.$transaction(async (tx) => {
      let finalInsight = industryInsight;

      if (!industryInsight) {
        finalInsight = await tx.industryInsight.create({
          data: {
            industry: data.industry,
            ...insights,
            nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
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

/* -------------------------------------------------------
   CHECK ONBOARDING STATUS
-------------------------------------------------------- */
export async function getUserOnboardingStatus() {
  const { userId } = await auth();
  if (!userId) return { isOnboarded: false };

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { industry: true },
  });

  return { isOnboarded: !!user?.industry };
}

/* -------------------------------------------------------
   FETCH INDUSTRY INSIGHTS (auto-generate if missing)
-------------------------------------------------------- */
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
