import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "fit";
  size?: "sm" | "md";
  children: React.ReactNode;
}

export function Badge({
  className,
  variant = "default",
  size = "sm",
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: "bg-muted text-muted-foreground",
    success: "bg-primary/12 text-primary",
    warning: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
    danger: "bg-destructive/12 text-destructive",
    info: "bg-blue-500/12 text-blue-600 dark:text-blue-400",
    fit: "bg-fit/15 text-lime-700 dark:text-lime-400",
  };

  const sizes = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-semibold rounded-full",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
