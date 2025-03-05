"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function updateUser(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: {
      clerkUserId: userId,
    },
  });

  if (!user) throw new Error("User not found");

  try {
    // transaction is used to ensure that all operations are successful or none are
    const result = await db.$transaction(
      async (tx) => {
        // find if the industry exists
        console.log("data", data);
        console.log("tx", tx);

        let industryInsight = await tx.industryInsight.findUnique({
          where: {
            industry: data.industry,
          },
        });

        // If industry does not exist, create it with default values - will replace it with ai later

        if (!industryInsight) {
          industryInsight = await tx.industryInsight.create({
            data: {
              industry: data.industry,
              salaryRanges: [],
              growthRate: 0,
              demandLevel: "Medium",
              topSkills: [],
              marketOutlook: "Neutral",
              keyTrends: [],
              recommendedSkills: [],
              nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
            },
          });
        }

        // Update the user

        const updateUser = await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            industry: data.industry,
            experience: data.experience,
            bio: data.bio,
            skills: data.skills,
          },
        });
        return { updateUser, industryInsight };
      },
      {
        timeout: 10000,
      }
    );

    return result.user;
  } catch (error) {
    console.error("Error in updating user and industry", error.message);
    throw new Error("Failed to update profile");
  }
}

export async function getUserOnboardingStatus() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: {
      clerkUserId: userId,
    },
  });

  if (!user) throw new Error("User not found");

  try {
    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        industry: true,
      },
    });

    return {
      //         Converts a "truthy" or "falsy" value to a strict boolean.

      // Example:

      // If industry is "tech" → !!"tech" → true.

      // If industry is null → !!null → false.
      isOnboarded: !!user?.industry,
    };
  } catch (error) {
    console.error("Error in getting user onboarding status", error.message);
    throw new Error("Failed to check onboarding status");
  }
}
