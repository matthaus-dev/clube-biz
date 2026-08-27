import { describe, expect, it } from "vitest";
import { evaluateClaimPolicy, startOfDayInTimeZone } from "./claim-policy";

const now = new Date("2026-08-26T15:00:00.000Z");

describe("claim policy", () => {
  it("allows an eligible claim", () => {
    expect(evaluateClaimPolicy({
      now,
      campaignStartsAt: null,
      campaignEndsAt: null,
      lastSuccessfulClaimAt: null,
      successfulClaimsToday: 0,
      cooldownHours: 12,
      dailyLimit: 2,
    })).toEqual({ allowed: true });
  });

  it("blocks a claim during cooldown", () => {
    expect(evaluateClaimPolicy({
      now,
      campaignStartsAt: null,
      campaignEndsAt: null,
      lastSuccessfulClaimAt: new Date("2026-08-26T04:00:01.000Z"),
      successfulClaimsToday: 1,
      cooldownHours: 12,
      dailyLimit: 2,
    })).toEqual({ allowed: false, reason: "COOLDOWN" });
  });

  it("blocks the daily limit", () => {
    expect(evaluateClaimPolicy({
      now,
      campaignStartsAt: null,
      campaignEndsAt: null,
      lastSuccessfulClaimAt: null,
      successfulClaimsToday: 2,
      cooldownHours: 12,
      dailyLimit: 2,
    })).toEqual({ allowed: false, reason: "DAILY_LIMIT" });
  });

  it("calculates local midnight in São Paulo", () => {
    expect(startOfDayInTimeZone(now, "America/Sao_Paulo").toISOString()).toBe("2026-08-26T03:00:00.000Z");
  });
});
