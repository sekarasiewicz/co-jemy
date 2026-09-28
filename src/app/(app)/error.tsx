"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button, Card, CardContent } from "@/components/ui";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto mt-10 max-w-md">
      <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Coś poszło nie tak
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Nie udało się wczytać tej strony. Spróbuj ponownie.
          </p>
          {error.digest && (
            <p className="mt-2 text-xs text-muted-foreground">
              Kod błędu: {error.digest}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={() => retry()}>
            Spróbuj ponownie
          </Button>
          <Link href="/today">
            <Button type="button" variant="ghost">
              Wróć do dziś
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
