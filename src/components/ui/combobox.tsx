"use client";

import { Check, ChevronDown, Plus, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onCreateNew?: (name: string) => Promise<ComboboxOption>;
  // Static options, filtered locally. Ignored when `onSearch` is given.
  options?: ComboboxOption[];
  // Server-side search: called (debounced) with the typed text.
  onSearch?: (query: string) => Promise<ComboboxOption[]>;
  // Label of the current value when it isn't among the loaded options.
  selectedLabel?: string;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function Combobox({
  value,
  onChange,
  onCreateNew,
  options = [],
  onSearch,
  selectedLabel,
  placeholder = "Szukaj...",
  label,
  className,
}: ComboboxProps) {
  const fieldId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<ComboboxOption[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!onSearch || !isOpen) return;
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await onSearch(search.trim());
        if (!cancelled) setResults(found);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [onSearch, isOpen, search]);

  const selectedOption =
    options.find((o) => o.value === value) ??
    (value && selectedLabel ? { value, label: selectedLabel } : undefined);

  const filteredOptions = onSearch
    ? results
    : options.filter((option) =>
        option.label.toLowerCase().includes(search.toLowerCase()),
      );

  // Check if search matches any existing option exactly
  const exactMatch = (onSearch ? results : options).some(
    (o) => o.label.toLowerCase() === search.toLowerCase(),
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearch("");
  };

  const handleCreateNew = async () => {
    if (!onCreateNew || !search.trim()) return;

    setCreating(true);
    try {
      const newOption = await onCreateNew(search.trim());
      onChange(newOption.value);
      setIsOpen(false);
      setSearch("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-sm font-medium text-foreground mb-1"
        >
          {label}
        </label>
      )}

      <div
        className={cn(
          "flex items-center gap-2 w-full px-3 py-2 border rounded-lg bg-background",
          "focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent",
          "border-input",
        )}
      >
        {isOpen ? (
          <input
            id={fieldId}
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
          />
        ) : (
          <button
            id={fieldId}
            type="button"
            onClick={() => {
              setIsOpen(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="flex-1 text-left text-foreground"
          >
            {selectedOption ? (
              selectedOption.label
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </button>
        )}

        {selectedOption && !isOpen && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
          {searching && filteredOptions.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Szukam...
            </div>
          )}

          {!searching && filteredOptions.length === 0 && !search.trim() && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Zacznij pisać, aby wyszukać...
            </div>
          )}

          {filteredOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50",
                option.value === value && "bg-muted",
              )}
            >
              {option.value === value && (
                <Check className="w-4 h-4 text-orange-500" />
              )}
              <span className={option.value === value ? "ml-0" : "ml-6"}>
                {option.label}
              </span>
            </button>
          ))}

          {search.trim() && !exactMatch && !searching && onCreateNew && (
            <button
              type="button"
              onClick={handleCreateNew}
              disabled={creating}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50 text-orange-600 dark:text-orange-400 border-t border-border"
            >
              <Plus className="w-4 h-4" />
              {creating ? "Tworzenie..." : `Dodaj "${search.trim()}"`}
            </button>
          )}

          {filteredOptions.length === 0 && search.trim() && exactMatch && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Brak wyników
            </div>
          )}
        </div>
      )}
    </div>
  );
}
