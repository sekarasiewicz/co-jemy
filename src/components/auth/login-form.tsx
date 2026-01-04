"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, CardContent, Input } from "@/components/ui";
import { signIn } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || "Błąd logowania");
        return;
      }

      router.push("/profiles");
      router.refresh();
    } catch {
      setError("Wystąpił błąd podczas logowania");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="pt-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Zaloguj się</h1>
          <p className="text-muted-foreground mt-1">Witaj ponownie!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="twoj@email.pl"
            required
          />

          <Input
            label="Hasło"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            Zaloguj się
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Nie masz konta?{" "}
          <Link
            href="/auth/register"
            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium"
          >
            Zarejestruj się
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
