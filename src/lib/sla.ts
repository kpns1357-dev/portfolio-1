import { PriorityLevel, SlaInfo, SlaStatus } from "./types";
import { differenceInHours, differenceInMinutes, addHours } from "date-fns";

export interface SlaDurations {
  CRITICAL: number; // hours (default 24)
  HIGH: number;     // hours (default 72 - 3 days)
  MEDIUM: number;   // hours (default 168 - 7 days)
  LOW: number;      // hours (default 336 - 14 days)
}

export const DEFAULT_SLA_DURATIONS: SlaDurations = {
  CRITICAL: 24,
  HIGH: 72,
  MEDIUM: 168,
  LOW: 336,
};

export function calculateSlaDeadline(
  createdAt: Date,
  priorityLabel: PriorityLevel,
  customDurations?: Partial<SlaDurations>
): Date {
  const durations = { ...DEFAULT_SLA_DURATIONS, ...(customDurations || {}) };
  const hours = durations[priorityLabel] || durations.MEDIUM;
  return addHours(createdAt, hours);
}

export function evaluateSla(deadline: Date | string, now: Date = new Date()): SlaInfo & { slaStatus: SlaStatus } {
  const target = typeof deadline === "string" ? new Date(deadline) : deadline;
  const minutesRemaining = differenceInMinutes(target, now);
  const hoursRemaining = differenceInHours(target, now);

  const isBreached = minutesRemaining <= 0;
  // Warning triggers when less than 25% of SLA or < 12 hours remain
  const isWarning = !isBreached && (hoursRemaining <= 12 || minutesRemaining <= 720);

  let statusText = "";
  let slaStatus: SlaStatus = "NORMAL";

  if (isBreached) {
    slaStatus = "BREACHED";
    const breachedHoursAgo = Math.abs(hoursRemaining);
    statusText = breachedHoursAgo < 1 ? "SLA BREACHED (<1h ago)" : `SLA BREACHED (${breachedHoursAgo}h overdue)`;
  } else if (isWarning) {
    slaStatus = "WARNING";
    if (hoursRemaining < 1) {
      statusText = `Due in ${minutesRemaining} minutes`;
    } else {
      statusText = `Due in ${hoursRemaining} hours (Urgent)`;
    }
  } else {
    slaStatus = "NORMAL";
    if (hoursRemaining >= 48) {
      const days = Math.round(hoursRemaining / 24);
      statusText = `Due in ${days} days`;
    } else {
      statusText = `Due in ${hoursRemaining} hours`;
    }
  }

  return {
    deadline: target.toISOString(),
    hoursRemaining,
    isBreached,
    isWarning,
    statusText,
    slaStatus,
  };
}
