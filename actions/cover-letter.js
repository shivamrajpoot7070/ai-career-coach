"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ------------------------------
// Gemini Setup + Retry Logic
// ------------------------------
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Generic retry wrapper
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
      console.warn(`AI retry... attempts left: ${retries}`);
      await new Promise((res) => setTimeout(res, delay));
      return retryAI(fn, retries - 1, delay * 1.5);
    }

    throw err;
  }
}

// Model fallback chain
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

      // Clean markdown fences if present
      const cleaned = text
        .replace(/```/g, "")
        .replace(/```markdown/g, "")
        .trim();

      return cleaned;
    } catch (err) {
      console.error(`Model ${m} failed →`, err.message);
      continue;
    }
  }

  throw new Error("All Gemini models failed");
}

// ------------------------------
// Generate Cover Letter
// ------------------------------
export async function generateCoverLetter(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const prompt = `
    Write a professional cover letter for a **${data.jobTitle}** position at **${data.companyName}**.

    Candidate Information:
    - Industry: ${user.industry}
    - Years of Experience: ${user.experience}
    - Skills: ${user.skills.join(", ")}
    - Bio: ${user.bio}

    Job Description:
    ${data.jobDescription}

    Requirements:
    1. Professional, enthusiastic tone.
    2. Highlight relevant skills and achievements.
    3. Connect the candidate’s experience with the company’s goals.
    4. Max 400 words.
    5. Use clean markdown formatting.
    6. Include specific achievements.
    7. Avoid generic statements.

    Generate ONLY the markdown cover letter, no extra text.
  `;

  try {
    // AI call OUTSIDE DB transaction
    const content = await generateWithFallback(prompt);

    // DB write (now safe)
    const coverLetter = await db.coverLetter.create({
      data: {
        content,
        jobDescription: data.jobDescription,
        companyName: data.companyName,
        jobTitle: data.jobTitle,
        status: "completed",
        userId: user.id,
      },
    });

    return coverLetter;
  } catch (error) {
    console.error("Error generating cover letter:", error);
    throw new Error("Failed to generate cover letter");
  }
}

// ------------------------------
// Fetch All Cover Letters
// ------------------------------
export async function getCoverLetters() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.coverLetter.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
}

// ------------------------------
// Fetch Single Cover Letter
// ------------------------------
export async function getCoverLetter(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.coverLetter.findUnique({
    where: { id, userId: user.id },
  });
}

// ------------------------------
// Delete Cover Letter
// ------------------------------
export async function deleteCoverLetter(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.coverLetter.delete({
    where: { id, userId: user.id },
  });
}
