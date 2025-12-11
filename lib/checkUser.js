import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "./prisma";

export const checkUser = async ({ allowRedirect = false } = {}) => {
  const user = await currentUser();
  if (!user) return null;

  try {
    const existingUser = await db.user.findUnique({
      where: { clerkUserId: user.id },
    });

    // ---------------------------------------------
    // If user already exists → redirect ONLY IF
    // onboarding is not completed
    // ---------------------------------------------
    if (existingUser) {
      if (allowRedirect && !existingUser.industry) {
        redirect("/onboarding");
      }
      return existingUser;
    }

    // ---------------------------------------------
    // If user does NOT exist → create new user
    // ---------------------------------------------
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();

    const newUser = await db.user.create({
      data: {
        clerkUserId: user.id,
        name,
        imageUrl: user.imageUrl,
        email: user.emailAddresses[0].emailAddress,
      },
    });

    // New users ALWAYS require onboarding
    if (allowRedirect) {
      redirect("/onboarding");
    }

    return newUser;

  } catch (err) {
    console.error("checkUser() error:", err.message);
    return null;
  }
};
