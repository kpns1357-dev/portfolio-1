import React from "react";
import clsx from "clsx";

interface PriorityBadgeProps {
  score: number;
  label?: string;
  showScore?: boolean;
  size?: "sm" | "md" | "lg";
}

export function PriorityBadge({
  score,
  label,
  showScore = true,
  size = "md",
}: PriorityBadgeProps) {
  const computedLabel = label || (score >= 75 ? "CRITICAL" : score >= 50 ? "HIGH" : score >= 25 ? "MEDIUM" : "LOW");

  const getStyle = () => {
    switch (computedLabel) {
      case "CRITICAL":
        return "bg-rose-100 text-rose-800 border-rose-300 font-semibold";
      case "HIGH":
        return "bg-amber-100 text-amber-900 border-amber-300 font-medium";
      case "MEDIUM":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "LOW":
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3.5 py-1.5 text-sm",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md border tracking-wider font-mono",
        getStyle(),
        sizeClasses[size]
      )}
      title={`Priority Score: ${score}/100`}
    >
      <span className="font-sans font-semibold mr-1">{computedLabel}</span>
      {showScore && (
        <span className="opacity-75 font-mono text-[11px]">
          ({score})
        </span>
      )}
    </span>
  );
}
