"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  clearAllDataAction,
  deleteAccountAction,
} from "@/app/actions/account";
import {
  createProfileAction,
  deleteProfileAction,
  updateProfileAction,
} from "@/app/actions/profiles";
import { ProfileAvatar } from "@/components/profiles/profile-avatar";
import { ProfileForm } from "@/components/profiles/profile-form";
import { Button, Card, CardContent, Input, Modal } from "@/components/ui";
import { useProfile } from "@/contexts/profile-context";
import { signOut } from "@/lib/auth-client";
import type { Profile } from "@/types";

const DELETE_CONFIRM_WORD = "USUŃ";

interface ProfilesManagerProps {
  initialProfiles: Profile[];
  showCreateForm?: boolean;
  userId: string;
}

export function ProfilesManager({
  initialProfiles,
  showCreateForm = false,
  userId,
}: ProfilesManagerProps) {
  const router = useRouter();
  const { setProfiles } = useProfile();
  const [profiles, setLocalProfiles] = useState(initialProfiles);
  const [isCreating, setIsCreating] = useState(showCreateForm);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<Profile | null>(null);
  const [copied, setCopied] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleClearData = async () => {
    setIsProcessing(true);
    try {
      await clearAllDataAction();
      setIsClearingData(false);
      router.refresh();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== DELETE_CONFIRM_WORD) return;
    setIsProcessing(true);
    try {
      await deleteAccountAction();
      // Session row is gone via cascade; clear the cookie best-effort.
      try {
        await signOut();
      } catch {
        // ignore — account already deleted
      }
      window.location.href = "/auth/login";
    } catch {
      setIsProcessing(false);
    }
  };

  const closeDeleteAccount = () => {
    setIsDeletingAccount(false);
    setConfirmDeleteAccount(false);
    setDeleteConfirmText("");
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
                    {profile.autoCalorieGoal && " • auto (BMR)"}
                    {profile.isChild && " • Profil dziecka"}
                  </p>
                  {(profile.height || profile.weight || profile.age) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[
                        profile.height && `${profile.height} cm`,
                        profile.weight && `${profile.weight} kg`,
                        profile.age && `${profile.age} lat`,
                        profile.sex === "male"
                          ? "♂"
                          : profile.sex === "female"
                            ? "♀"
                            : null,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  )}
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

      {/* Danger Zone */}
      <Card className="border-destructive/40">
        <CardContent className="py-4 space-y-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            <h2 className="font-medium">Strefa zagrożenia</h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Wyczyść wszystkie dane
              </p>
              <p className="text-sm text-muted-foreground">
                Usuwa dania, składniki, tagi, typy posiłków, plany dnia i listy
                zakupów. Konto i profile pozostają.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsClearingData(true)}
              className="shrink-0"
            >
              Wyczyść dane
            </Button>
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Usuń konto</p>
              <p className="text-sm text-muted-foreground">
                Trwale usuwa konto wraz ze wszystkimi profilami i danymi. Tej
                operacji nie można cofnąć.
              </p>
            </div>
            <Button
              variant="danger"
              onClick={() => setIsDeletingAccount(true)}
              className="shrink-0"
            >
              Usuń konto
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Clear Data Confirmation */}
      <Modal
        isOpen={isClearingData}
        onClose={() => !isProcessing && setIsClearingData(false)}
        title="Wyczyść wszystkie dane"
      >
        <p className="text-muted-foreground mb-6">
          Czy na pewno chcesz usunąć wszystkie dania, składniki, tagi, typy
          posiłków, plany dnia i listy zakupów? Konto i profile pozostaną. Tej
          operacji nie można cofnąć.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setIsClearingData(false)}
            disabled={isProcessing}
            className="flex-1"
          >
            Anuluj
          </Button>
          <Button
            variant="danger"
            onClick={handleClearData}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? "Usuwanie..." : "Wyczyść dane"}
          </Button>
        </div>
      </Modal>

      {/* Delete Account Confirmation */}
      <Modal
        isOpen={isDeletingAccount}
        onClose={() => !isProcessing && closeDeleteAccount()}
        title="Usuń konto"
      >
        {!confirmDeleteAccount ? (
          <>
            <p className="text-muted-foreground mb-6">
              To trwale usunie Twoje konto, wszystkie profile i wszystkie dane.
              Tej operacji nie można cofnąć.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={closeDeleteAccount}
                className="flex-1"
              >
                Anuluj
              </Button>
              <Button
                variant="danger"
                onClick={() => setConfirmDeleteAccount(true)}
                className="flex-1"
              >
                Kontynuuj
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-muted-foreground mb-4">
              Wpisz{" "}
              <strong className="text-foreground">{DELETE_CONFIRM_WORD}</strong>,
              aby potwierdzić trwałe usunięcie konta.
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={DELETE_CONFIRM_WORD}
              className="mb-6"
              autoFocus
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={closeDeleteAccount}
                disabled={isProcessing}
                className="flex-1"
              >
                Anuluj
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteAccount}
                disabled={
                  isProcessing || deleteConfirmText !== DELETE_CONFIRM_WORD
                }
                className="flex-1"
              >
                {isProcessing ? "Usuwanie..." : "Usuń konto na zawsze"}
              </Button>
            </div>
          </>
        )}
      </Modal>

      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4">
        <span>User ID: {userId}</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(userId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="hover:text-foreground transition-colors"
          title="Kopiuj User ID"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
