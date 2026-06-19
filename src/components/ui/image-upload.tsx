"use client";

import { upload } from "@vercel/blob/client";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  /** aspect ratio of the preview box */
  aspect?: "video" | "square";
  className?: string;
  /** folder prefix in the blob store */
  folder?: string;
}

export function ImageUpload({
  value,
  onChange,
  label,
  aspect = "video",
  className,
  folder = "uploads",
}: ImageUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Wybierz plik graficzny");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Maksymalny rozmiar to 8 MB");
      return;
    }

    setUploading(true);
    try {
      const blob = await upload(`${folder}/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });
      onChange(blob.url);
      toast.success("Zdjęcie przesłane");
    } catch (error) {
      toast.error(
        (error as Error).message || "Nie udało się przesłać zdjęcia",
      );
    } finally {
      setUploading(false);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <div className={className}>
      {label && (
        <span className="block text-sm font-medium text-foreground mb-1.5">
          {label}
        </span>
      )}

      {value ? (
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-xl border border-border bg-muted",
            aspect === "video" ? "aspect-video" : "aspect-square max-w-48",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Podgląd"
            className="h-full w-full object-cover"
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition-colors hover:bg-destructive"
            title="Usuń zdjęcie"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-muted-foreground transition-colors",
            aspect === "video" ? "aspect-video" : "aspect-square max-w-48",
            dragging
              ? "border-primary bg-primary/5 text-primary"
              : "border-border hover:border-primary/50 hover:text-foreground",
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Przesyłanie...</span>
            </>
          ) : (
            <>
              <ImagePlus className="h-7 w-7" />
              <span className="text-sm font-medium">Dodaj zdjęcie</span>
              <span className="text-xs text-muted-foreground/70">
                Kliknij lub przeciągnij · max 8 MB
              </span>
            </>
          )}
        </button>
      )}

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  );
}
