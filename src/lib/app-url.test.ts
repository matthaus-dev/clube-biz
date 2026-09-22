import { describe, expect, it } from "vitest";
import { resolveAppUrl } from "./app-url";

describe("resolveAppUrl", () => {
  it("uses the configured application URL", () => {
    expect(resolveAppUrl({ APP_URL: "https://clube.example" })).toBe("https://clube.example");
  });

  it("ignores an empty APP_URL and uses the Vercel production domain", () => {
    expect(
      resolveAppUrl({
        APP_URL: "",
        VERCEL_PROJECT_PRODUCTION_URL: "clube-biz.vercel.app",
      }),
    ).toBe("https://clube-biz.vercel.app");
  });

  it("uses the deployment domain when the production domain is unavailable", () => {
    expect(resolveAppUrl({ VERCEL_URL: "clube-biz-preview.vercel.app" })).toBe(
      "https://clube-biz-preview.vercel.app",
    );
  });

  it("uses localhost outside Vercel when no URL is configured", () => {
    expect(resolveAppUrl({ APP_URL: "   " })).toBe("http://localhost:3000");
  });
});
