import { useId } from "react";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={cn("size-8", className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c5cff" />
          <stop offset="1" stopColor="#4f2fe0" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${id})`} />
      <g fill="none" stroke="#fff" strokeWidth="4">
        <rect x="12" y="12" width="16" height="16" rx="4.5" />
        <rect x="36" y="12" width="16" height="16" rx="4.5" />
        <rect x="12" y="36" width="16" height="16" rx="4.5" />
      </g>
      <g fill="#fff">
        <rect x="17.5" y="17.5" width="5" height="5" rx="1.5" />
        <rect x="41.5" y="17.5" width="5" height="5" rx="1.5" />
        <rect x="17.5" y="41.5" width="5" height="5" rx="1.5" />
        <rect x="36" y="36" width="6" height="6" rx="2" />
        <rect x="46" y="36" width="6" height="6" rx="2" />
        <rect x="41" y="41" width="6" height="6" rx="2" />
        <rect x="36" y="46" width="6" height="6" rx="2" />
        <rect x="46" y="46" width="6" height="6" rx="2" />
      </g>
    </svg>
  );
}
