"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "./auth";
import {
  getProfilesByUserId,
  getProfileById,
  createProfile,
  updateProfile,
  deleteProfile,
  createDefaultProfile,
} from "@/lib/services/profiles";
import { createDefaultMealTypes } from "@/lib/services/meal-types";
import type { Profile } from "@/types";

export async function getProfilesAction(): Promise<Profile[]> {
  const session = await requireAuth();
  return getProfilesByUserId(session.user.id);
}

export async function getProfileAction(profileId: string): Promise<Profile | undefined> {
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
  }
): Promise<Profile> {
  const session = await requireAuth();
  const profile = await updateProfile(profileId, session.user.id, data);
  revalidatePath("/profiles");
  return profile;
}

export async function deleteProfileAction(profileId: string): Promise<void> {
  const session = await requireAuth();
  await deleteProfile(profileId, session.user.id);
  revalidatePath("/profiles");
}

export async function initializeNewUserAction(): Promise<Profile> {
  const session = await requireAuth();

  // Create default profile
  const profile = await createDefaultProfile(
    session.user.id,
    session.user.name || "Ja"
  );

  // Create default meal types
  await createDefaultMealTypes(session.user.id);

  revalidatePath("/");
  return profile;
}
