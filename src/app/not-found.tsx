import Link from "next/link";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl font-extrabold text-primary">404</p>
      <h1 className="text-xl font-semibold text-foreground">
        Nie znaleziono strony
      </h1>
      <p className="text-sm text-muted-foreground">
        Ta strona nie istnieje albo została usunięta.
      </p>
      <Link href="/today">
        <Button type="button">Wróć do aplikacji</Button>
      </Link>
    </main>
  );
}
