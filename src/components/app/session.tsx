"use client";
import { createContext, use } from "react";
import type { Organization, Role } from "@/lib/db/schema";

export interface Me {
  user: { id: string; name: string; email: string; role: Role; orgId: string };
  org: Organization;
  ai: { enabled: boolean; model: string };
}

export const SessionContext = createContext<{ me: Me; refresh: () => void } | null>(null);

export function useSession() {
  const ctx = use(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside the app shell");
  return ctx;
}

const RANK: Record<Role, number> = { viewer: 0, analyst: 1, admin: 2 };
export function useCan(min: Role) {
  return RANK[useSession().me.user.role] >= RANK[min];
}
