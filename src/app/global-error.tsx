"use client";

// Replaces the root layout when it fails, so global styles aren't loaded here.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="pl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: 16,
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <title>Błąd — co jemy?</title>
        <h1 style={{ fontSize: 20, margin: 0 }}>Coś poszło nie tak</h1>
        <p style={{ margin: 0, color: "#666" }}>
          Aplikacja napotkała nieoczekiwany błąd.
          {error.digest ? ` Kod błędu: ${error.digest}` : ""}
        </p>
        <button
          type="button"
          onClick={() => retry()}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: "#ea580c",
            color: "white",
            cursor: "pointer",
          }}
        >
          Spróbuj ponownie
        </button>
      </body>
    </html>
  );
}
