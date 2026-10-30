import { cn } from "@/lib/utils";

export interface ProgressRingProps {
  percentage?: number;
  value?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  colorClass?: string;
  showText?: boolean;
}

export function ProgressRing({
  percentage,
  value,
  size = 48,
  strokeWidth = 4,
  className,
  colorClass,
  showText = true,
}: ProgressRingProps) {
  const raw = value ?? percentage ?? 0;
  const clamped = Math.min(100, Math.max(0, raw));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center shrink-0", className)}>
      <svg
        width={size}
        height={size}
        className="-rotate-90 transform"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn("transition-all duration-300 ease-out", colorClass || "text-primary")}
        />
      </svg>
      {showText && (
        <span className="absolute text-[11px] font-bold text-foreground tabular-nums">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
