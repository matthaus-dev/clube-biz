import { afterEach, describe, expect, it, vi } from "vitest";
import { deliverOtp } from "./otp-delivery";

const config = vi.hoisted(() => ({ OTP_DELIVERY_MODE: "evolution", OTP_BASE_URL: "https://example.test/api/", OTP_API_TOKEN: "test-secret", OTP_INSTANCE: "clubebiz" }));
vi.mock("@/lib/env", () => ({ getEnv: () => config }));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); config.OTP_DELIVERY_MODE = "evolution"; });

describe("Evolution OTP delivery", () => {
  it("sends text through the configured instance and keeps credentials in headers", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetcher);
    await deliverOtp("+5511980000001", "123456");
    const [url, options] = fetcher.mock.calls[0];
    expect(String(url)).toBe("https://example.test/api/message/sendText/clubebiz");
    expect(options.headers.apikey).toBe("test-secret");
    expect(JSON.parse(options.body)).toMatchObject({ number: "5511980000001", text: expect.stringContaining("123456"), linkPreview: false });
    expect(options.redirect).toBe("error");
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([401, 429, 500])("sanitizes provider failure %s without retrying", async (status) => {
    const fetcher = vi.fn().mockResolvedValue(new Response("sensitive provider payload", { status }));
    vi.stubGlobal("fetch", fetcher);
    await expect(deliverOtp("+5511980000001", "123456")).rejects.toThrow("OTP_DELIVERY_UNAVAILABLE");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("sanitizes network and timeout errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("secret details")));
    await expect(deliverOtp("+5511980000001", "123456")).rejects.toThrow(/^OTP_DELIVERY_UNAVAILABLE$/);
  });

  it("only permits console delivery outside production", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    config.OTP_DELIVERY_MODE = "console";
    await deliverOtp("+5511980000001", "123456");
    vi.stubEnv("NODE_ENV", "production");
    await expect(deliverOtp("+5511980000001", "123456")).rejects.toThrow("OTP_DELIVERY_UNAVAILABLE");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not silently succeed when disabled", async () => {
    config.OTP_DELIVERY_MODE = "disabled";
    await expect(deliverOtp("+5511980000001", "123456")).rejects.toThrow("OTP_DELIVERY_UNAVAILABLE");
  });
});
