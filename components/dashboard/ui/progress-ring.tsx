import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressRingProps extends React.SVGProps<SVGSVGElement> {
  value: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  colorClass?: string;
  trackClass?: string;
}

export function ProgressRing({
  value,
  size = 48,
  strokeWidth = 4,
  showLabel = true,
  colorClass = "text-primary",
  trackClass = "text-border",
  className,
  ...props
}: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, isNaN(value) ? 0 : value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg]"
        {...props}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="none"
          className={cn("transition-colors", trackClass)}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn("transition-all duration-300 ease-out", colorClass)}
        />
      </svg>
      {showLabel && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums text-foreground">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}

