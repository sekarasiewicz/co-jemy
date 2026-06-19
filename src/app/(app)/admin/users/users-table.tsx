"use client";

import { ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  deleteUserAction,
  setUserRoleAction,
} from "@/app/actions/admin";
import { Badge, Button, Card, CardContent, Modal } from "@/components/ui";
import type { AdminUserRow } from "@/lib/services/admin";

export function UsersTable({
  users,
  currentUserId,
}: {
  users: AdminUserRow[];
  currentUserId: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminUserRow | null>(null);

  const toggleRole = async (u: AdminUserRow) => {
    const next = u.role === "admin" ? "user" : "admin";
    setBusy(u.id);
    try {
      await setUserRoleAction(u.id, next);
      toast.success(
        next === "admin"
          ? `${u.email} jest teraz adminem`
          : `${u.email} stracił uprawnienia admina`,
      );
    } catch (e) {
      toast.error((e as Error).message || "Nie udało się zmienić roli");
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setBusy(confirmDelete.id);
    try {
      await deleteUserAction(confirmDelete.id);
      toast.success("Konto usunięte");
      setConfirmDelete(null);
    } catch (e) {
      toast.error((e as Error).message || "Nie udało się usunąć konta");
    } finally {
      setBusy(null);
    }
  };

  const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            return (
              <div
                key={u.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">
                      {u.name || u.email}
                    </p>
                    {u.role === "admin" && (
                      <Badge variant="success">admin</Badge>
                    )}
                    {isSelf && <Badge variant="info">Ty</Badge>}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {u.email}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    {u.profiles} profili · {u.meals} dań · {u.ingredients}{" "}
                    składników · ${u.aiCostUsd.toFixed(3)} AI · od{" "}
                    {fmtDate(u.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    loading={busy === u.id}
                    onClick={() => toggleRole(u)}
                    disabled={isSelf}
                    title={
                      isSelf
                        ? "Nie możesz zmienić własnej roli"
                        : u.role === "admin"
                          ? "Odbierz admina"
                          : "Nadaj admina"
                    }
                  >
                    {u.role === "admin" ? (
                      <>
                        <ShieldOff className="h-4 w-4" /> Odbierz
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" /> Admin
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(u)}
                    disabled={isSelf || busy === u.id}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Usunąć konto?"
      >
        <p className="text-muted-foreground mb-6">
          Konto <strong className="text-foreground">{confirmDelete?.email}</strong>{" "}
          oraz wszystkie jego dane (profile, dania, składniki, plany) zostaną
          trwale usunięte. Tej operacji nie można cofnąć.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setConfirmDelete(null)}
          >
            Anuluj
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            loading={busy === confirmDelete?.id}
            onClick={handleDelete}
          >
            Usuń konto
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
