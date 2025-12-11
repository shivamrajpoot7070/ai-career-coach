"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* -------------------------------------------------------
   MODEL FALLBACK SYSTEM — WORKS EVEN WHEN MAIN MODEL FAILS
-------------------------------------------------------- */

const MODEL_ORDER = [
  "gemini-2.5-flash",        // Fastest (but overloaded sometimes)
  "gemini-flash-latest",     // Very stable alternative
  "gemini-2.5-flash-lite"    // Always available fallback
];

async function generateWithFallback(prompt) {
  for (const modelName of MODEL_ORDER) {
    try {
      console.log("Trying model:", modelName);

      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);

      return result.response.text();
    } catch (err) {
      console.log(`Model ${modelName} failed →`, err.message);
      continue; // try next model
    }
  }

  throw new Error("All Gemini models failed");
}

/* -------------------------------------------------------
   1) Generate Quiz
-------------------------------------------------------- */

export async function generateQuiz() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { industry: true, skills: true }
  });

  if (!user) throw new Error("User not found");

  const prompt = `
    Generate 10 technical MCQ interview questions for a ${user.industry} professional
    ${user.skills?.length ? `with expertise in ${user.skills.join(", ")}` : ""}.

    Format EXACT JSON:
    {
      "questions": [
        {
          "question": "",
          "options": ["", "", "", ""],
          "correctAnswer": "",
          "explanation": ""
        }
      ]
    }
  `;

  try {
    const raw = await generateWithFallback(prompt);

    const cleaned = raw.replace(/```json|```/g, "").trim();
    const quiz = JSON.parse(cleaned);

    return quiz.questions;
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw new Error("Failed to generate quiz questions");
  }
}

/* -------------------------------------------------------
   2) Save Quiz Result + Generate Improvement Tip
-------------------------------------------------------- */

export async function saveQuizResult(questions, answers, score) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId }
  });

  if (!user) throw new Error("User not found");

  const questionResults = questions.map((q, idx) => ({
    question: q.question,
    answer: q.correctAnswer,
    userAnswer: answers[idx],
    isCorrect: q.correctAnswer === answers[idx],
    explanation: q.explanation
  }));

  const wrongAnswers = questionResults.filter((q) => !q.isCorrect);

  let improvementTip = null;

  if (wrongAnswers.length > 0) {
    const wrongText = wrongAnswers
      .map(
        (q) =>
          `Question: "${q.question}"\nCorrect: "${q.answer}"\nUser: "${q.userAnswer}"`
      )
      .join("\n\n");

    const improvementPrompt = `
      Based on the mistakes below, provide a short 2-sentence improvement tip.
      Do NOT mention the mistakes directly — focus on what the learner should improve.

      ${wrongText}
    `;

    try {
      const tipRaw = await generateWithFallback(improvementPrompt);
      improvementTip = tipRaw.trim();
    } catch (error) {
      console.error("Error generating improvement tip:", error);
      improvementTip = null;
    }
  }

  try {
    const assessment = await db.assessment.create({
      data: {
        userId: user.id,
        quizScore: score,
        questions: questionResults,
        category: "Technical",
        improvementTip
      }
    });

    return assessment;
  } catch (error) {
    console.error("Error saving quiz result:", error);
    throw new Error("Failed to save quiz result");
  }
}

/* -------------------------------------------------------
   3) Retrieve All Assessments
-------------------------------------------------------- */

export async function getAssessments() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId }
  });

  if (!user) throw new Error("User not found");

  try {
    return await db.assessment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" }
    });
  } catch (error) {
    console.error("Error fetching assessments:", error);
    throw new Error("Failed to fetch assessments");
  }
}
