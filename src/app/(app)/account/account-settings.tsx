"use client";

import { KeyRound, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button, Card, CardContent, Input } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

interface AccountSettingsProps {
  user: { name: string; email: string };
}

export function AccountSettings({ user }: AccountSettingsProps) {
  const router = useRouter();

  const [name, setName] = useState(user.name);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const { error } = await authClient.updateUser({
        name: name.trim() || undefined,
      });
      if (error) throw new Error(error.message);
      toast.success("Zapisano");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message || "Nie udało się zapisać");
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Nowe hasło musi mieć min. 8 znaków");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Hasła nie są takie same");
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (error) throw new Error(error.message);
      toast.success("Hasło zmienione");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      toast.error((e as Error).message || "Nie udało się zmienić hasła");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h2 className="font-semibold text-foreground">Profil konta</h2>

          <div className="space-y-4">
            <Input
              label="Imię"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Twoje imię"
            />
            <Input
              label="Email"
              value={user.email}
              disabled
              title="Adres email nie może być zmieniony"
            />
            <p className="text-xs text-muted-foreground">
              Zdjęcie ustawiasz osobno dla każdego profilu rodziny.
            </p>
            <Button
              onClick={() => saveProfile()}
              loading={savingProfile}
              className="w-full sm:w-auto"
            >
              Zapisz
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
            <KeyRound className="h-4 w-4" />
            Zmiana hasła
          </h2>

          <form onSubmit={changePassword} className="space-y-4">
            <Input
              label="Obecne hasło"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Nowe hasło"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="min. 8 znaków"
                required
                autoComplete="new-password"
              />
              <Input
                label="Powtórz nowe hasło"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Po zmianie hasła zostaniesz wylogowany na innych urządzeniach.
            </p>
            <Button type="submit" loading={changingPassword}>
              Zmień hasło
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Family profiles link */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium text-foreground">Profile rodziny</p>
              <p className="text-sm text-muted-foreground">
                Dodawaj i edytuj profile domowników
              </p>
            </div>
          </div>
          <Link href="/profiles/manage">
            <Button variant="outline">Zarządzaj</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
