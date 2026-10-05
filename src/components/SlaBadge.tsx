import React from "react";
import clsx from "clsx";
import { AlertTriangle, Clock, AlertOctagon } from "lucide-react";

interface SlaBadgeProps {
  slaStatus: "NORMAL" | "WARNING" | "BREACHED" | string;
  statusText?: string;
  hoursRemaining?: number;
  deadline?: string;
  size?: "sm" | "md";
}

export function SlaBadge({
  slaStatus,
  statusText,
  hoursRemaining,
  size = "md",
}: SlaBadgeProps) {
  const isBreached = slaStatus === "BREACHED";
  const isWarning = slaStatus === "WARNING";

  const getStyle = () => {
    if (isBreached) {
      return "bg-rose-100 text-rose-900 border-rose-300 font-bold animate-pulse";
    }
    if (isWarning) {
      return "bg-amber-100 text-amber-950 border-amber-300 font-medium";
    }
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  const displayText =
    statusText ||
    (isBreached
      ? "SLA BREACHED"
      : isWarning
      ? `Due in ${hoursRemaining || 12}h (Urgent)`
      : `SLA Normal (${hoursRemaining || 24}h left)`);

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md border font-mono tracking-tight shadow-2xs",
        getStyle(),
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      )}
    >
      {isBreached ? (
        <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
      ) : isWarning ? (
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
      ) : (
        <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      )}
      <span>{displayText}</span>
    </span>
  );
}
