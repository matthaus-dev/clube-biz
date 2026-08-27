export type ClaimPolicyInput = {
  now: Date;
  campaignStartsAt: Date | null;
  campaignEndsAt: Date | null;
  lastSuccessfulClaimAt: Date | null;
  successfulClaimsToday: number;
  cooldownHours: number;
  dailyLimit: number;
};

export type ClaimPolicyResult =
  | { allowed: true }
  | { allowed: false; reason: "CAMPAIGN_NOT_STARTED" | "CAMPAIGN_ENDED" | "COOLDOWN" | "DAILY_LIMIT" };

export function evaluateClaimPolicy(input: ClaimPolicyInput): ClaimPolicyResult {
  if (input.campaignStartsAt && input.now < input.campaignStartsAt) {
    return { allowed: false, reason: "CAMPAIGN_NOT_STARTED" };
  }
  if (input.campaignEndsAt && input.now > input.campaignEndsAt) {
    return { allowed: false, reason: "CAMPAIGN_ENDED" };
  }
  if (input.lastSuccessfulClaimAt) {
    const cooldownMs = input.cooldownHours * 60 * 60 * 1000;
    if (input.now.getTime() - input.lastSuccessfulClaimAt.getTime() < cooldownMs) {
      return { allowed: false, reason: "COOLDOWN" };
    }
  }
  if (input.successfulClaimsToday >= input.dailyLimit) {
    return { allowed: false, reason: "DAILY_LIMIT" };
  }
  return { allowed: true };
}

export function startOfDayInTimeZone(now: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const localAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  const offset = localAsUtc - now.getTime();
  return new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)) - offset);
}
