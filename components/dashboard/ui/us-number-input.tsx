"use client";

import React, { useState, useCallback } from "react";
import {
  formatUSNumber,
  formatPlainDraft,
  parseUserNumber,
} from "@/lib/number-format";
import { cn } from "@/lib/utils";

export interface USNumberInputProps {
  value: number | null | undefined;
  onValueChange: (value: number | null) => void;
  onValidityChange?: (isValid: boolean, error: string | null) => void;
  decimalScale?: number;
  minDecimalsDisplay?: number;
  min?: number;
  max?: number;
  allowNegative?: boolean;
  allowZero?: boolean;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
  "aria-label"?: string;
  error?: string | null;
  showValidationError?: boolean;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export function USNumberInput({
  value,
  onValueChange,
  onValidityChange,
  decimalScale = 2,
  minDecimalsDisplay = 0,
  min,
  max,
  allowNegative = false,
  allowZero = true,
  required = false,
  disabled = false,
  readOnly = false,
  placeholder,
  className,
  id,
  name,
  "aria-label": ariaLabel,
  error: externalError,
  showValidationError = true,
  onFocus: externalOnFocus,
  onBlur: externalOnBlur,
}: USNumberInputProps) {
  const formatDisplay = useCallback(
    (num: number | null | undefined): string => {
      if (num === null || num === undefined || !Number.isFinite(num)) {
        return "";
      }
      return formatUSNumber(num, {
        minDecimals: minDecimalsDisplay,
        maxDecimals: decimalScale,
      });
    },
    [minDecimalsDisplay, decimalScale]
  );

  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState<string>(() => formatDisplay(value));
  const [internalError, setInternalError] = useState<string | null>(null);

  const displayedInputValue =
    isFocused || internalError !== null ? draft : formatDisplay(value);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (!internalError) {
      // Strip display commas by converting committed numeric value to plain ungrouped draft
      setDraft(formatPlainDraft(value, decimalScale));
    }
    externalOnFocus?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDraft(raw);

    const trimmed = raw.trim();

    if (trimmed === "") {
      if (required) {
        const msg = "This value is required.";
        setInternalError(msg);
        onValidityChange?.(false, msg);
      } else {
        setInternalError(null);
        onValidityChange?.(true, null);
        onValueChange(null);
      }
      return;
    }

    // Allow incomplete typing states without showing premature error or overwriting draft
    if (
      (allowNegative && trimmed === "-") ||
      /^-?\d+\.$/.test(trimmed)
    ) {
      if (!allowNegative && trimmed.startsWith("-")) {
        const msg = "Negative values are not allowed.";
        setInternalError(msg);
        onValidityChange?.(false, msg);
        return;
      }
      setInternalError(null);
      onValidityChange?.(true, null);
      return;
    }

    const parsed = parseUserNumber(raw, {
      required,
      allowNegative,
      allowZero,
      min,
      max,
      maxDecimals: decimalScale,
    });

    if (!parsed.ok) {
      setInternalError(parsed.error);
      onValidityChange?.(false, parsed.error);
      return;
    }

    setInternalError(null);
    onValidityChange?.(true, null);
    onValueChange(parsed.value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);

    const parsed = parseUserNumber(draft, {
      required,
      allowNegative,
      allowZero,
      min,
      max,
      maxDecimals: decimalScale,
    });

    if (!parsed.ok) {
      setInternalError(parsed.error);
      onValidityChange?.(false, parsed.error);
      // Keep invalid draft visible so user can correct it (never silently strip commas or convert to 0)
      externalOnBlur?.(e);
      return;
    }

    setInternalError(null);
    onValidityChange?.(true, null);
    onValueChange(parsed.value);
    setDraft(formatDisplay(parsed.value));
    externalOnBlur?.(e);
  };

  const displayedError = externalError || internalError;

  return (
    <div className="w-full">
      <input
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={ariaLabel}
        aria-invalid={Boolean(displayedError)}
        disabled={disabled}
        readOnly={readOnly}
        placeholder={placeholder}
        value={displayedInputValue}
        onFocus={handleFocus}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(
          "tabular-nums transition-colors outline-none",
          displayedError &&
            "border-destructive! focus:border-destructive! focus:ring-destructive/20!",
          className
        )}
      />
      {showValidationError && displayedError && (
        <p className="mt-1 text-[11px] font-semibold text-destructive">
          {displayedError}
        </p>
      )}
    </div>
  );
}
