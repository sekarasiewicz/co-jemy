import { cn } from "@/lib/utils";

interface ProfileAvatarProps {
  name: string;
  avatar?: string | null;
  color?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function ProfileAvatar({
  name,
  avatar,
  color = "#10b981",
  size = "md",
  className,
}: ProfileAvatarProps) {
  const sizes = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-16 h-16 text-2xl",
    xl: "w-24 h-24 text-4xl",
  };

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold text-white",
        sizes[size],
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {avatar || initials}
    </div>
  );
}
