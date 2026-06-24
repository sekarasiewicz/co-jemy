"use client";

import { Barcode, Info, ScanLine, Tag } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  createMealDraftFromBarcodeAction,
  createMealDraftFromBarcodeNumberAction,
  createMealDraftFromProductImageAction,
  type MealDraft,
} from "@/app/actions/meal-ai";
import { Button, Card, CardContent, Input, Tooltip } from "@/components/ui";

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
  const [loading, setLoading] = useState<"label" | "barcode" | "number" | null>(
    null,
  );
  const [barcodeNumber, setBarcodeNumber] = useState("");
  const labelRef = useRef<HTMLInputElement>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const handleNumber = async () => {
    const ean = barcodeNumber.replace(/\D/g, "");
    if (ean.length < 8) {
      toast.error("Wpisz poprawny kod kreskowy");
      return;
    }
    setLoading("number");
    try {
      const draft = await createMealDraftFromBarcodeNumberAction(ean);
      onDraft(draft);
      setBarcodeNumber("");
      toast.success("Produkt rozpoznany — sprawdź i zapisz");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nie znaleziono produktu");
    } finally {
      setLoading(null);
    }
  };

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
          <Tooltip
            side="bottom"
            className="max-w-[260px] text-left"
            content={
              <span className="block space-y-1">
                <span className="block">
                  <strong>Etykieta</strong> — sfotografuj tabelę wartości
                  odżywczych z opakowania.
                </span>
                <span className="block">
                  <strong>Kod kreskowy</strong> — sfotografuj paski z cyframi
                  (zwykle z tyłu/spodu opakowania).
                </span>
                <span className="block">
                  <strong>Numer</strong> — wpisz cyfry spod kodu (EAN, 8–13
                  cyfr).
                </span>
              </span>
            }
          >
            <Info className="w-4 h-4 text-muted-foreground cursor-help" />
          </Tooltip>
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

        <div className="flex items-end gap-2 border-t border-border pt-4">
          <div className="flex-1">
            <Input
              label="...lub wpisz numer kodu"
              value={barcodeNumber}
              onChange={(e) => setBarcodeNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleNumber();
                }
              }}
              placeholder="np. 5900512983004"
              inputMode="numeric"
              disabled={loading !== null}
            />
          </div>
          <Button
            type="button"
            onClick={handleNumber}
            loading={loading === "number"}
            disabled={loading !== null || !barcodeNumber.trim()}
          >
            Szukaj
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
