"use client";

import { ImagePlus, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  createMealDraftFromImageAction,
  createMealDraftFromTextAction,
  type MealDraft,
} from "@/app/actions/meal-ai";
import { Button, Card, CardContent, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("Nie udało się odczytać pliku"));
    reader.readAsDataURL(file);
  });
}

interface AiMealGeneratorProps {
  onDraft: (draft: MealDraft) => void;
}

export function AiMealGenerator({ onDraft }: AiMealGeneratorProps) {
  const [mode, setMode] = useState<"text" | "image">("text");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleText = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const draft = await createMealDraftFromTextAction(text);
      onDraft(draft);
      toast.success("Danie rozpoznane — sprawdź i zapisz");
    } catch {
      toast.error("Nie udało się rozpoznać dania z tekstu");
    } finally {
      setLoading(false);
    }
  };

  const handleImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Wybierz plik graficzny");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Zdjęcie jest za duże (max 8 MB)");
      return;
    }
    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const draft = await createMealDraftFromImageAction({
        base64,
        mimeType: file.type,
      });
      onDraft(draft);
      toast.success("Danie rozpoznane — sprawdź i zapisz");
    } catch {
      toast.error("Nie udało się rozpoznać dania ze zdjęcia");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="border-orange-500/30 bg-orange-500/[0.03]">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-500" />
          <h2 className="font-semibold text-foreground">Dodaj z AI</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Wklej przepis albo dodaj zdjęcie — AI rozpozna składniki i policzy
          wartości odżywcze. Formularz poniżej wypełni się automatycznie.
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("text")}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              mode === "text"
                ? "bg-orange-600 text-white dark:bg-orange-500"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            Tekst
          </button>
          <button
            type="button"
            onClick={() => setMode("image")}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              mode === "image"
                ? "bg-orange-600 text-white dark:bg-orange-500"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            Zdjęcie
          </button>
        </div>

        {mode === "text" ? (
          <div className="space-y-3">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Wklej przepis — nazwa, składniki z ilościami, sposób przygotowania..."
              rows={6}
              disabled={loading}
            />
            <Button
              type="button"
              onClick={handleText}
              loading={loading}
              disabled={!text.trim()}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generuj z tekstu
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImage(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              loading={loading}
            >
              <ImagePlus className="w-4 h-4 mr-2" />
              Wybierz zdjęcie przepisu
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
