import * as React from "react";
import { cn } from "@/lib/utils";
import { formatMoney } from "./formatters";

export interface MoneyTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number | null | undefined;
}

export function MoneyText({ value, className, ...props }: MoneyTextProps) {
  return (
    <span
      className={cn("tabular-nums whitespace-nowrap font-semibold", className)}
      {...props}
    >
      {formatMoney(value)}
    </span>
  );
}

