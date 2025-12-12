"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { generateAI } from "@/lib/gemini"; // <-- your new shared engine

/* -------------------------------------------------------
   1) Generate Quiz (Uses generateAI)
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

    Return ONLY JSON.
  `;

  try {
    const raw = await generateAI(prompt);   // 🔥 unified engine

    const cleaned = raw.replace(/```json|```/g, "").trim();
    const quiz = JSON.parse(cleaned);

    return quiz.questions;
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw new Error("Failed to generate quiz questions");
  }
}

/* -------------------------------------------------------
   2) Save Quiz Result + Improvement Tip (Uses generateAI)
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

  const wrong = questionResults.filter((q) => !q.isCorrect);
  let improvementTip = null;

  if (wrong.length > 0) {
    const wrongText = wrong
      .map(
        (q) =>
          `Question: "${q.question}"\nCorrect: "${q.answer}"\nUser: "${q.userAnswer}"`
      )
      .join("\n\n");

    const improvementPrompt = `
      Provide a 2-sentence improvement tip based on these mistakes.
      Do NOT mention the mistakes directly — only what the learner should improve.

      ${wrongText}
    `;

    try {
      improvementTip = (await generateAI(improvementPrompt)).trim(); // 🔥 unified engine
    } catch (err) {
      console.error("AI improvement tip failed:", err);
      improvementTip = null;
    }
  }

  try {
    return await db.assessment.create({
      data: {
        userId: user.id,
        quizScore: score,
        questions: questionResults,
        category: "Technical",
        improvementTip
      }
    });
  } catch (error) {
    console.error("Error saving quiz result:", error);
    throw new Error("Failed to save quiz result");
  }
}

/* -------------------------------------------------------
   3) Get Assessments
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
