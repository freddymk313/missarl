import { formatUSD } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface MoneyTextProps {
  amount: number | null | undefined;
  className?: string;
}

export function MoneyText({ amount, className }: MoneyTextProps) {
  return (
    <span className={cn("font-semibold tabular-nums whitespace-nowrap", className)}>
      {formatUSD(amount)}
    </span>
  );
}
