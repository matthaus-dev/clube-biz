import "server-only";

type AppUrlEnvironment = {
  APP_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  VERCEL_URL?: string;
};

const LOCAL_APP_URL = "http://localhost:3000";

export function resolveAppUrl(environment?: AppUrlEnvironment): string {
  const source = environment ?? process.env;
  const configuredUrl = source.APP_URL?.trim();

  if (configuredUrl) {
    return configuredUrl;
  }

  const vercelHost =
    source.VERCEL_PROJECT_PRODUCTION_URL?.trim() || source.VERCEL_URL?.trim();

  return vercelHost ? `https://${vercelHost}` : LOCAL_APP_URL;
}
