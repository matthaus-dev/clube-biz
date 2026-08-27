import type { MerchantRole } from "@prisma/client";

export type Permission =
  | "dashboard:view"
  | "customers:view"
  | "transactions:view"
  | "points:create"
  | "points:reverse"
  | "redemptions:create"
  | "redemptions:cancel"
  | "campaign:update"
  | "rewards:manage";

const permissions: Record<MerchantRole, ReadonlySet<Permission>> = {
  OWNER: new Set([
    "dashboard:view", "customers:view", "transactions:view", "points:create", "points:reverse",
    "redemptions:create", "redemptions:cancel", "campaign:update", "rewards:manage",
  ]),
  MANAGER: new Set([
    "dashboard:view", "customers:view", "transactions:view", "points:create", "points:reverse",
    "redemptions:create", "redemptions:cancel", "campaign:update", "rewards:manage",
  ]),
  ATTENDANT: new Set([
    "dashboard:view", "customers:view", "transactions:view", "points:create", "redemptions:create",
  ]),
};

export function can(role: MerchantRole, permission: Permission): boolean {
  return permissions[role].has(permission);
}

export function assertPermission(role: MerchantRole, permission: Permission): void {
  if (!can(role, permission)) throw new Error("FORBIDDEN");
}

export function manualCreditLimit(role: MerchantRole, campaignDefault: number): number {
  if (role === "ATTENDANT") return campaignDefault;
  if (role === "MANAGER") return 50;
  return Number.MAX_SAFE_INTEGER;
}
