"use server";

import { revalidatePath } from "next/cache";
import { addMissingDefaultMealTypes } from "@/lib/services/meal-types";
import {
  createDefaultProfile,
  createProfile,
  deleteProfile,
  getProfileById,
  getProfilesByUserId,
  updateProfile,
} from "@/lib/services/profiles";
import type { Profile } from "@/types";
import { requireAuth } from "./auth";

export async function getProfilesAction(): Promise<Profile[]> {
  const session = await requireAuth();
  return getProfilesByUserId(session.user.id);
}

export async function getProfileAction(
  profileId: string,
): Promise<Profile | undefined> {
  const session = await requireAuth();
  return getProfileById(profileId, session.user.id);
}

export async function createProfileAction(data: {
  name: string;
  avatar?: string;
  color?: string;
  dailyCalorieGoal?: number;
  dailyProteinGoal?: number;
  dailyCarbsGoal?: number;
  dailyFatGoal?: number;
  isChild?: boolean;
}): Promise<Profile> {
  const session = await requireAuth();
  const profile = await createProfile(session.user.id, data);
  revalidatePath("/profiles");
  return profile;
}

export async function updateProfileAction(
  profileId: string,
  data: {
    name?: string;
    avatar?: string;
    color?: string;
    dailyCalorieGoal?: number;
    dailyProteinGoal?: number;
    dailyCarbsGoal?: number;
    dailyFatGoal?: number;
    isChild?: boolean;
    isActive?: boolean;
  },
): Promise<Profile> {
  const session = await requireAuth();
  const profile = await updateProfile(profileId, session.user.id, data);
  revalidatePath("/profiles");
  return profile;
}

// Propagate the account avatar to the family profile that matches the
// account name (e.g. the owner's own profile), so it's not just initials.
export async function syncAvatarToMatchingProfileAction(
  imageUrl: string,
): Promise<void> {
  const session = await requireAuth();
  const name = session.user.name;
  if (!name) return;

  const { and, eq, sql } = await import("drizzle-orm");
  const { db } = await import("@/db");
  const { profiles } = await import("@/db/schema");

  await db
    .update(profiles)
    .set({ avatar: imageUrl })
    .where(
      and(
        eq(profiles.userId, session.user.id),
        sql`lower(${profiles.name}) = lower(${name})`,
      ),
    );

  revalidatePath("/profiles");
  revalidatePath("/today");
}

export async function deleteProfileAction(profileId: string): Promise<void> {
  const session = await requireAuth();
  await deleteProfile(profileId, session.user.id);
  revalidatePath("/profiles");
}

export async function initializeNewUserAction(): Promise<Profile> {
  const session = await requireAuth();

  // Check if user already has profiles (prevent duplicates)
  const existingProfiles = await getProfilesByUserId(session.user.id);
  if (existingProfiles.length > 0) {
    return existingProfiles[0];
  }

  // Create default profile
  const profile = await createDefaultProfile(
    session.user.id,
    session.user.name || "Ja",
  );

  await addMissingDefaultMealTypes(session.user.id);

  return profile;
}
