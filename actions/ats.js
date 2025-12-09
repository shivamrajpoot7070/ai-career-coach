"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Call our PDF API route
async function extractResumeTextFromAPI(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/extract`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "PDF extraction failed");
  }

  return data.text;
}

export async function generateAtsScore(formData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const resumeFile = formData.get("resumeFile");
  const jobDescription = formData.get("jobDescription");

  try {
    // 1. Extract resume text via API
    const resumeText = await extractResumeTextFromAPI(resumeFile);

    // 2. Build AI prompt
    const prompt = `
      You are an ATS scoring engine.

      Resume:
      ${resumeText}

      Job Description:
      ${jobDescription}

      Return VALID JSON ONLY:
      {
        "score": number,
        "missingKeywords": [string],
        "matchedKeywords": [string],
        "recommendations": string
      }
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const ai = await model.generateContent(prompt);

    const jsonText = ai.response.text();
    const parsed = JSON.parse(jsonText);

    // 3. Save to database
    const saved = await db.atsReport.create({
      data: {
        userId,
        resumeText,
        jobDescription,
        score: parsed.score,
        missingKeywords: parsed.missingKeywords,
        matchedKeywords: parsed.matchedKeywords,
        recommendations: parsed.recommendations,
      },
    });

    return { success: true, report: saved };
  } catch (err) {
    console.error("ATS Score Error:", err);
    return { error: err.message || "Failed to generate ATS score" };
  }
}
