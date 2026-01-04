import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import type { Profile, NewProfile } from "@/types";

const MAX_PROFILES_PER_USER = 6;

export async function getProfilesByUserId(userId: string): Promise<Profile[]> {
  return db.query.profiles.findMany({
    where: eq(profiles.userId, userId),
    orderBy: profiles.createdAt,
  });
}

export async function getProfileById(
  profileId: string,
  userId: string
): Promise<Profile | undefined> {
  return db.query.profiles.findFirst({
    where: and(eq(profiles.id, profileId), eq(profiles.userId, userId)),
  });
}

export async function createProfile(
  userId: string,
  data: Omit<NewProfile, "id" | "userId" | "createdAt">
): Promise<Profile> {
  const existingProfiles = await getProfilesByUserId(userId);

  if (existingProfiles.length >= MAX_PROFILES_PER_USER) {
    throw new Error(`Maksymalna liczba profili to ${MAX_PROFILES_PER_USER}`);
  }

  const [profile] = await db
    .insert(profiles)
    .values({
      id: generateId(),
      userId,
      ...data,
    })
    .returning();

  return profile;
}

export async function updateProfile(
  profileId: string,
  userId: string,
  data: Partial<Omit<NewProfile, "id" | "userId" | "createdAt">>
): Promise<Profile> {
  const [profile] = await db
    .update(profiles)
    .set(data)
    .where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)))
    .returning();

  if (!profile) {
    throw new Error("Profil nie został znaleziony");
  }

  return profile;
}

export async function deleteProfile(
  profileId: string,
  userId: string
): Promise<void> {
  const existingProfiles = await getProfilesByUserId(userId);

  if (existingProfiles.length <= 1) {
    throw new Error("Nie można usunąć ostatniego profilu");
  }

  await db
    .delete(profiles)
    .where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)));
}

export async function createDefaultProfile(
  userId: string,
  name: string
): Promise<Profile> {
  return createProfile(userId, {
    name,
    isActive: true,
  });
}
