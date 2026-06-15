"use client";

import { ArrowLeft, FileText, FileUp, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  type DietImportResult,
  importDietFromPdfAction,
} from "@/app/actions/diet-import";
import { Button, Card, CardContent, DatePicker, Select } from "@/components/ui";

interface ImportDietFormProps {
  profiles: { id: string; name: string }[];
}

/** Monday of the current week, formatted as yyyy-mm-dd. */
function currentMonday(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  now.setDate(now.getDate() + diff);
  return now.toISOString().slice(0, 10);
}

export function ImportDietForm({ profiles }: ImportDietFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? "");
  const [startDate, setStartDate] = useState(currentMonday());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DietImportResult | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      toast.error("Wybierz plik PDF");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      // strip "data:application/pdf;base64," prefix
      setBase64(dataUrl.split(",")[1] ?? null);
      setFileName(file.name);
    };
    reader.onerror = () => toast.error("Nie udało się odczytać pliku");
    reader.readAsDataURL(file);
  };

  const handleImport = async () => {
    if (!base64 || !profileId) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await importDietFromPdfAction(base64, profileId, startDate);
      setResult(res);
      if (res.mealsCreated > 0) {
        toast.success(
          `Zaimportowano ${res.mealsCreated} dań, zaplanowano ${res.daysPlanned} dni`,
        );
      } else {
        toast.error("Nie zaimportowano żadnych dań");
      }
    } catch {
      toast.error("Import nie powiódł się");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Link
        href="/meals"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Powrót do listy dań
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
          <Sparkles className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Import diety z PDF
          </h1>
          <p className="text-muted-foreground">
            AI wyciągnie dania, składniki i ułoży plan tygodnia
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFile}
            className="hidden"
          />
          {fileName ? (
            <div className="border-2 border-emerald-500/30 bg-emerald-500/5 rounded-lg p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-medium text-foreground">{fileName}</span>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Zmień plik
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-12 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              <FileUp className="w-8 h-8 mx-auto mb-2" />
              <span className="text-sm font-medium block">
                Kliknij, aby wybrać plik PDF
              </span>
              <span className="text-xs block mt-1">jadłospis od dietetyka</span>
            </button>
          )}

          <Select
            label="Profil"
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            options={profiles.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="Wybierz profil"
          />

          <DatePicker
            label="Początek tygodnia"
            value={startDate}
            onChange={setStartDate}
          />
        </CardContent>
      </Card>

      {result && (
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-1">
            <p className="text-emerald-600 dark:text-emerald-400 font-medium">
              Dania: {result.mealsCreated} · Składniki:{" "}
              {result.ingredientsCreated} · Dni: {result.daysPlanned}
            </p>
            {result.errors.map((err, i) => (
              <p key={i} className="text-destructive text-sm">
                {err}
              </p>
            ))}
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
          disabled={!base64 || !profileId}
          className="flex-1"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Importuj z AI
        </Button>
      </div>

      {loading && (
        <p className="text-center text-sm text-muted-foreground mt-4">
          Analizuję PDF przez AI — to może potrwać kilkadziesiąt sekund...
        </p>
      )}
    </div>
  );
}
