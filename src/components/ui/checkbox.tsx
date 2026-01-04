import { Check } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, checked, ...props }, ref) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <label
        htmlFor={checkboxId}
        className={cn(
          "inline-flex items-center gap-2 cursor-pointer",
          props.disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            checked={checked}
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              "w-5 h-5 border-2 rounded flex items-center justify-center transition-colors",
              "peer-focus:ring-2 peer-focus:ring-ring peer-focus:ring-offset-1 peer-focus:ring-offset-background",
              checked
                ? "bg-emerald-600 border-emerald-600 dark:bg-emerald-500 dark:border-emerald-500"
                : "bg-background border-input",
            )}
          >
            {checked && (
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            )}
          </div>
        </div>
        {label && <span className="text-sm text-foreground">{label}</span>}
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";
