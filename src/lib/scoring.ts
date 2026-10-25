import type { Issue, Severity } from "@/lib/db/schema";

export const SEVERITY_WEIGHT: Record<Severity, number> = { critical: 15, high: 8, medium: 3, low: 1 };
export const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

export const isOpen = (i: Pick<Issue, "status">) => i.status === "open" || i.status === "in_progress";
export const isOverdue = (i: Pick<Issue, "status" | "dueAt">, now = new Date()) => isOpen(i) && !!i.dueAt && i.dueAt < now;

/**
 * Compliance posture, 0-100. Each open issue adds weighted risk by severity (overdue counts double);
 * the score decays smoothly from 100 so a long backlog never pins it at zero and every fix still moves it.
 * Accepted risks and remediated issues do not count.
 */
export const POSTURE_SCALE = 200;

export function postureScore(list: Pick<Issue, "status" | "severity" | "dueAt">[], now = new Date()) {
  const risk = list.filter((i) => isOpen(i)).reduce((sum, i) => sum + SEVERITY_WEIGHT[i.severity] * (isOverdue(i, now) ? 2 : 1), 0);
  return Math.round(100 * Math.exp(-risk / POSTURE_SCALE));
}

export function postureGrade(score: number) {
  if (score >= 90) return { grade: "A", label: "Strong" };
  if (score >= 75) return { grade: "B", label: "Sound" };
  if (score >= 60) return { grade: "C", label: "Needs attention" };
  if (score >= 40) return { grade: "D", label: "Weak" };
  return { grade: "E", label: "Critical" };
}

export function severityFromScore(score: number): Severity {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  return "low";
}
