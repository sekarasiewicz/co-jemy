"use client";

import { ArrowLeft, ChevronDown, ChevronUp, FileText, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { importMealsFromMarkdownAction } from "@/app/actions/meals";
import { Button, Card, CardContent, Textarea } from "@/components/ui";

const EXAMPLE_FORMAT = `# Spaghetti Bolognese

## Info
- Porcje: 4
- Przygotowanie: 15 min
- Gotowanie: 45 min
- Typ: Obiad, Kolacja
- Tagi: Włoskie, Makaron
- Opis: Klasyczne włoskie danie

## Składniki
- 500g mielona wołowina
- 400g pomidory krojone
- 200g makaron spaghetti
- 1 szt cebula
- 2 ząbek czosnek
- 2 łyżka oliwy

## Instrukcje
1. Podsmaż cebulę na oliwie
2. Dodaj mięso i smaż do zbrązowienia
3. Dodaj pomidory i gotuj 30 min
4. Ugotuj makaron al dente
5. Podawaj makaron z sosem

## Cechy
- Dla dzieci

---

# Kolejne danie...`;

export default function ImportMealsPage() {
  const router = useRouter();
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFormat, setShowFormat] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    errors: string[];
  } | null>(null);

  const handleImport = async () => {
    if (!markdown.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const importResult = await importMealsFromMarkdownAction(markdown);
      setResult(importResult);

      if (importResult.imported > 0) {
        toast.success(`Zaimportowano ${importResult.imported} ${importResult.imported === 1 ? "przepis" : "przepisów"}`);
        if (importResult.errors.length === 0) {
          setTimeout(() => {
            router.push("/meals");
          }, 1500);
        }
      } else if (importResult.errors.length > 0) {
        toast.error("Wystąpiły błędy podczas importu");
      }
    } catch {
      toast.error("Nie udało się zaimportować przepisów");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/meals"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Powrót do listy dań
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
          <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Import z Markdown</h1>
          <p className="text-muted-foreground">
            Wklej przepisy w formacie markdown
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <button
            type="button"
            onClick={() => setShowFormat(!showFormat)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            {showFormat ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            {showFormat ? "Ukryj format" : "Pokaż wymagany format"}
          </button>

          {showFormat && (
            <pre className="p-4 bg-muted rounded-lg text-sm text-foreground overflow-x-auto mb-4 whitespace-pre-wrap">
              {EXAMPLE_FORMAT}
            </pre>
          )}

          <Textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="Wklej tutaj przepisy w formacie markdown..."
            rows={16}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      {result && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            {result.imported > 0 && (
              <p className="text-emerald-600 dark:text-emerald-400 font-medium mb-2">
                Zaimportowano {result.imported}{" "}
                {result.imported === 1
                  ? "przepis"
                  : result.imported < 5
                    ? "przepisy"
                    : "przepisów"}
              </p>
            )}
            {result.errors.length > 0 && (
              <div className="space-y-1">
                {result.errors.map((error, i) => (
                  <p key={i} className="text-destructive text-sm">
                    {error}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex-1"
        >
          Anuluj
        </Button>
        <Button
          onClick={handleImport}
          loading={loading}
          disabled={!markdown.trim()}
          className="flex-1"
        >
          <Upload className="w-4 h-4 mr-2" />
          Importuj
        </Button>
      </div>
    </div>
  );
}
