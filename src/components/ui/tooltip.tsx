"use client";

import { cn } from "@/lib/utils";
import { type ReactNode, useRef, useState } from "react";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}

export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const show = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(true), 300);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div
          role="tooltip"
          className={cn(
            "absolute left-1/2 -translate-x-1/2 z-50 px-2.5 py-1.5 text-xs font-medium rounded-lg shadow-lg whitespace-normal max-w-[200px] text-center pointer-events-none",
            "bg-foreground text-background",
            "animate-in fade-in-0 zoom-in-95 duration-150",
            side === "top" && "bottom-full mb-1.5",
            side === "bottom" && "top-full mt-1.5",
            className,
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
