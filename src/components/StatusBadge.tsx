import React from "react";
import clsx from "clsx";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md" | "lg";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const getStyle = () => {
    switch (status) {
      case "REPORTED":
        return "bg-slate-100 text-slate-700 border-slate-300";
      case "UNDER_REVIEW":
        return "bg-amber-50 text-amber-800 border-amber-300";
      case "VERIFIED":
        return "bg-blue-50 text-blue-700 border-blue-300";
      case "ASSIGNED":
        return "bg-indigo-50 text-indigo-700 border-indigo-300";
      case "INSPECTION_PENDING":
        return "bg-purple-50 text-purple-700 border-purple-300";
      case "IN_PROGRESS":
        return "bg-sky-50 text-sky-800 border-sky-300";
      case "REPAIR_COMPLETED":
        return "bg-teal-50 text-teal-800 border-teal-300";
      case "VERIFICATION_PENDING":
        return "bg-orange-50 text-orange-800 border-orange-300 animate-pulse";
      case "RESOLVED":
        return "bg-emerald-50 text-emerald-800 border-emerald-300";
      case "REJECTED":
        return "bg-rose-50 text-rose-800 border-rose-300";
      case "REOPENED":
        return "bg-red-50 text-red-800 border-red-400 font-semibold";
      case "ESCALATED":
        return "bg-crimson-50 text-rose-900 border-rose-500 font-semibold";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getLabel = () => {
    switch (status) {
      case "INSPECTION_PENDING":
        return "Inspection Pending";
      case "IN_PROGRESS":
        return "In Progress";
      case "REPAIR_COMPLETED":
        return "Repair Completed";
      case "VERIFICATION_PENDING":
        return "Verification Required";
      default:
        return status.charAt(0) + status.slice(1).toLowerCase().replace("_", " ");
    }
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs font-medium",
    lg: "px-3.5 py-1.5 text-sm font-medium",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border shadow-sm tracking-wide transition-colors",
        getStyle(),
        sizeClasses[size]
      )}
    >
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-80" />
      {getLabel()}
    </span>
  );
}
