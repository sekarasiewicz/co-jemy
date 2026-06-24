"use client";

import { Barcode, ScanLine, Tag } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  createMealDraftFromBarcodeAction,
  createMealDraftFromProductImageAction,
  type MealDraft,
} from "@/app/actions/meal-ai";
import { Button, Card, CardContent } from "@/components/ui";

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

interface ProductImporterProps {
  onDraft: (draft: MealDraft) => void;
}

export function ProductImporter({ onDraft }: ProductImporterProps) {
  const [loading, setLoading] = useState<"label" | "barcode" | null>(null);
  const labelRef = useRef<HTMLInputElement>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const run = async (
    file: File | undefined,
    kind: "label" | "barcode",
    ref: React.RefObject<HTMLInputElement | null>,
  ) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Wybierz plik graficzny");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Zdjęcie jest za duże (max 8 MB)");
      return;
    }
    setLoading(kind);
    try {
      const base64 = await fileToBase64(file);
      const action =
        kind === "barcode"
          ? createMealDraftFromBarcodeAction
          : createMealDraftFromProductImageAction;
      const draft = await action({ base64, mimeType: file.type });
      onDraft(draft);
      toast.success("Produkt rozpoznany — sprawdź i zapisz");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Nie udało się rozpoznać produktu",
      );
    } finally {
      setLoading(null);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <Card className="border-sky-500/30 bg-sky-500/[0.03]">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <Barcode className="w-5 h-5 text-sky-500" />
          <h2 className="font-semibold text-foreground">Gotowy produkt</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Baton, mrożona pizza, jogurt... Dodaj zdjęcie etykiety albo kodu
          kreskowego — wartości odżywcze uzupełnią się automatycznie.
        </p>

        <input
          ref={labelRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => run(e.target.files?.[0], "label", labelRef)}
        />
        <input
          ref={barcodeRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => run(e.target.files?.[0], "barcode", barcodeRef)}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => labelRef.current?.click()}
            loading={loading === "label"}
            disabled={loading !== null}
          >
            <Tag className="w-4 h-4 mr-2" />
            Zdjęcie etykiety
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => barcodeRef.current?.click()}
            loading={loading === "barcode"}
            disabled={loading !== null}
          >
            <ScanLine className="w-4 h-4 mr-2" />
            Zdjęcie kodu kreskowego
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
