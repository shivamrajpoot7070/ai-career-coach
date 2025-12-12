"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { generateAI } from "@/lib/gemini"; // <-- unified AI engine

/* -------------------------------------------------------
   SAVE RESUME
-------------------------------------------------------- */
export async function saveResume(content) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const resume = await db.resume.upsert({
      where: { userId: user.id },
      update: { content },
      create: { userId: user.id, content },
    });

    revalidatePath("/resume");
    return resume;
  } catch (error) {
    console.error("Error saving resume:", error);
    throw new Error("Failed to save resume");
  }
}

/* -------------------------------------------------------
   GET RESUME
-------------------------------------------------------- */
export async function getResume() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.resume.findUnique({
    where: { userId: user.id },
  });
}

/* -------------------------------------------------------
   IMPROVE RESUME WITH AI (uses generateAI)
-------------------------------------------------------- */
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
    - Highlight relevant technical skills
    - Keep it a single polished paragraph
    - No extra explanations, ONLY the improved text
  `;

  try {
    const improved = await generateAI(prompt); // 🔥 unified engine
    return improved.trim();
  } catch (error) {
    console.error("Error improving resume section:", error);
    throw new Error("Failed to improve content");
  }
}
