"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, CardContent, Input } from "@/components/ui";
import { signUp } from "@/lib/auth-client";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Hasła nie są takie same");
      return;
    }

    if (password.length < 8) {
      setError("Hasło musi mieć minimum 8 znaków");
      return;
    }

    setLoading(true);

    try {
      const result = await signUp.email({
        email,
        password,
        name,
      });

      if (result.error) {
        setError(result.error.message || "Błąd rejestracji");
        return;
      }

      router.push("/profiles?new=true");
      router.refresh();
    } catch {
      setError("Wystąpił błąd podczas rejestracji");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="pt-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Utwórz konto</h1>
          <p className="text-muted-foreground mt-1">Zacznij planować posiłki</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Imię"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jan"
            required
          />

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
            placeholder="Minimum 8 znaków"
            required
          />

          <Input
            label="Powtórz hasło"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            Zarejestruj się
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Masz już konto?{" "}
          <Link
            href="/auth/login"
            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium"
          >
            Zaloguj się
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
