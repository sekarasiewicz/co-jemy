import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { deleteUnreferencedBlobs } from "@/lib/services/blob-cleanup";
import { stripProtected } from "@/lib/services/ownership";
import { generateId } from "@/lib/utils";
import type { NewProfile, Profile } from "@/types";
import { UserError } from "@/lib/action-result";

const MAX_PROFILES_PER_USER = 6;

export async function getProfilesByUserId(userId: string): Promise<Profile[]> {
  return db.query.profiles.findMany({
    where: eq(profiles.userId, userId),
    orderBy: profiles.createdAt,
  });
}

export async function getProfileById(
  profileId: string,
  userId: string,
): Promise<Profile | undefined> {
  return db.query.profiles.findFirst({
    where: and(eq(profiles.id, profileId), eq(profiles.userId, userId)),
  });
}

export async function createProfile(
  userId: string,
  data: Omit<NewProfile, "id" | "userId" | "createdAt">,
): Promise<Profile> {
  const existingProfiles = await getProfilesByUserId(userId);

  if (existingProfiles.length >= MAX_PROFILES_PER_USER) {
    throw new UserError(`Maksymalna liczba profili to ${MAX_PROFILES_PER_USER}`);
  }

  const [profile] = await db
    .insert(profiles)
    .values({
      ...stripProtected(data),
      id: generateId(),
      userId,
    })
    .returning();

  return profile;
}

export async function updateProfile(
  profileId: string,
  userId: string,
  data: Partial<Omit<NewProfile, "id" | "userId" | "createdAt">>,
): Promise<Profile> {
  const previous =
    data.avatar !== undefined
      ? await getProfileById(profileId, userId)
      : undefined;

  const [profile] = await db
    .update(profiles)
    .set(stripProtected(data))
    .where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)))
    .returning();

  if (!profile) {
    throw new UserError("Profil nie został znaleziony");
  }
  if (previous?.avatar && previous.avatar !== profile.avatar) {
    await deleteUnreferencedBlobs([previous.avatar]);
  }

  return profile;
}

export async function deleteProfile(
  profileId: string,
  userId: string,
): Promise<void> {
  const existingProfiles = await getProfilesByUserId(userId);

  if (existingProfiles.length <= 1) {
    throw new UserError("Nie można usunąć ostatniego profilu");
  }

  const deleted = await db
    .delete(profiles)
    .where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)))
    .returning({ avatar: profiles.avatar });
  await deleteUnreferencedBlobs(deleted.map((p) => p.avatar));
}

export async function createDefaultProfile(
  userId: string,
  name: string,
): Promise<Profile> {
  return createProfile(userId, {
    name,
    isActive: true,
  });
}
