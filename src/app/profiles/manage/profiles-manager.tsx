"use client";

import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createProfileAction,
  deleteProfileAction,
  updateProfileAction,
} from "@/app/actions/profiles";
import { ProfileAvatar } from "@/components/profiles/profile-avatar";
import { ProfileForm } from "@/components/profiles/profile-form";
import { Button, Card, CardContent, Modal } from "@/components/ui";
import { useProfile } from "@/contexts/profile-context";
import type { Profile } from "@/types";

interface ProfilesManagerProps {
  initialProfiles: Profile[];
  showCreateForm?: boolean;
}

export function ProfilesManager({
  initialProfiles,
  showCreateForm = false,
}: ProfilesManagerProps) {
  const router = useRouter();
  const { setProfiles } = useProfile();
  const [profiles, setLocalProfiles] = useState(initialProfiles);
  const [isCreating, setIsCreating] = useState(showCreateForm);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<Profile | null>(null);

  const handleCreate = async (
    data: Parameters<typeof createProfileAction>[0],
  ) => {
    const profile = await createProfileAction(data);
    const updated = [...profiles, profile];
    setLocalProfiles(updated);
    setProfiles(updated);
    setIsCreating(false);
    router.refresh();
  };

  const handleUpdate = async (
    data: Parameters<typeof updateProfileAction>[1],
  ) => {
    if (!editingProfile) return;
    const profile = await updateProfileAction(editingProfile.id, data);
    const updated = profiles.map((p) => (p.id === profile.id ? profile : p));
    setLocalProfiles(updated);
    setProfiles(updated);
    setEditingProfile(null);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deletingProfile) return;
    await deleteProfileAction(deletingProfile.id);
    const updated = profiles.filter((p) => p.id !== deletingProfile.id);
    setLocalProfiles(updated);
    setProfiles(updated);
    setDeletingProfile(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <Link
        href="/profiles"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Powrót do wyboru profilu
      </Link>

      <div className="space-y-4">
        {profiles.map((profile) => (
          <Card key={profile.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <ProfileAvatar
                  name={profile.name}
                  avatar={profile.avatar}
                  color={profile.color}
                  size="md"
                />
                <div>
                  <p className="font-medium text-foreground">{profile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {profile.dailyCalorieGoal} kcal/dzień
                    {profile.isChild && " • Profil dziecka"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingProfile(profile)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                {profiles.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingProfile(profile)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {profiles.length < 6 && !isCreating && (
        <Button
          variant="outline"
          onClick={() => setIsCreating(true)}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Dodaj profil
        </Button>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        title="Nowy profil"
        size="lg"
      >
        <ProfileForm
          onSubmit={handleCreate}
          onCancel={() => setIsCreating(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingProfile}
        onClose={() => setEditingProfile(null)}
        title="Edytuj profil"
        size="lg"
      >
        {editingProfile && (
          <ProfileForm
            profile={editingProfile}
            onSubmit={handleUpdate}
            onCancel={() => setEditingProfile(null)}
          />
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deletingProfile}
        onClose={() => setDeletingProfile(null)}
        title="Usuń profil"
      >
        <p className="text-muted-foreground mb-6">
          Czy na pewno chcesz usunąć profil{" "}
          <strong className="text-foreground">{deletingProfile?.name}</strong>?
          Wszystkie plany dnia przypisane do tego profilu zostaną usunięte.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setDeletingProfile(null)}
            className="flex-1"
          >
            Anuluj
          </Button>
          <Button variant="danger" onClick={handleDelete} className="flex-1">
            Usuń
          </Button>
        </div>
      </Modal>
    </div>
  );
}
