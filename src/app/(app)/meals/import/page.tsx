"use client";

import { ArrowLeft, ChevronDown, ChevronUp, FileText, FileUp, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { importMealsFromMarkdownAction } from "@/app/actions/meals";
import { Button, Card, CardContent, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";

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
  const [mode, setMode] = useState<"paste" | "upload">("paste");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<{
    imported: number;
    errors: string[];
  } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".md") && !file.name.endsWith(".markdown") && !file.name.endsWith(".txt")) {
      toast.error("Obsługiwane formaty: .md, .markdown, .txt");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setMarkdown(text);
      setFileName(file.name);
    };
    reader.onerror = () => {
      toast.error("Nie udało się odczytać pliku");
    };
    reader.readAsText(file);
  };

  const handleClearFile = () => {
    setMarkdown("");
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
            Wklej lub wgraj przepisy w formacie markdown
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

          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg mb-4">
            <button
              type="button"
              onClick={() => { setMode("paste"); handleClearFile(); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                mode === "paste"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText className="w-4 h-4" />
              Wklej tekst
            </button>
            <button
              type="button"
              onClick={() => { setMode("upload"); setMarkdown(""); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                mode === "upload"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileUp className="w-4 h-4" />
              Wgraj plik
            </button>
          </div>

          {mode === "paste" ? (
            <Textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder="Wklej tutaj przepisy w formacie markdown..."
              rows={16}
              className="font-mono text-sm"
            />
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.markdown,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              {fileName ? (
                <div className="border-2 border-emerald-500/30 bg-emerald-500/5 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-medium text-foreground">{fileName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearFile}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      Zmień plik
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {markdown.split("\n").length} linii, {markdown.length} znaków
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-12 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                  <FileUp className="w-8 h-8 mx-auto mb-2" />
                  <span className="text-sm font-medium block">Kliknij, aby wybrać plik</span>
                  <span className="text-xs block mt-1">.md, .markdown lub .txt</span>
                </button>
              )}
            </div>
          )}
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
