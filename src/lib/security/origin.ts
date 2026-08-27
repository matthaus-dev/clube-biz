export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) throw new Error("INVALID_ORIGIN");
  const protocol = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  if (new URL(origin).host !== host || new URL(origin).protocol !== `${protocol}:`) {
    throw new Error("INVALID_ORIGIN");
  }
}
