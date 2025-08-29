"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function getUserFromAuth() {
  const { userId } = auth(); // no await needed for Clerk server-side
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  return user;
}

// Save resume
export async function saveResume(content) {
  const user = await getUserFromAuth();
  if (!user) return null; // user not signed in

  const resume = await db.resume.upsert({
    where: { userId: user.id },
    update: { content },
    create: { userId: user.id, content },
  });

  revalidatePath("/resume");
  return resume;
}

// Get resume
export async function getResume() {
  const user = await getUserFromAuth();
  if (!user) return null; // handle gracefully

  return await db.resume.findUnique({
    where: { userId: user.id },
  });
}

// Improve with AI
export async function improveWithAI({ current, type }) {
  const user = await getUserFromAuth();
  if (!user) return null;

  const prompt = `
    As an expert resume writer, improve the following ${type} description for a ${user.industry} professional.
    Make it more impactful, quantifiable, and aligned with industry standards.
    Current content: "${current}"

    Requirements:
    1. Use action verbs
    2. Include metrics and results where possible
    3. Highlight relevant technical skills
    4. Keep it concise but detailed
    5. Focus on achievements over responsibilities
    6. Use industry-specific keywords

    Format the response as a single paragraph without any additional text or explanations.
  `;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Error improving content:", error);
    return current; // fallback to current content
  }
}
