import { z } from "zod";

const optionalNonEmptyString = z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional());

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  APP_URL: z.string().url().default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(32),
  PII_ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/),
  PII_HASH_PEPPER: z.string().min(32),
  RATE_LIMIT_STORE_URL: z.string().optional(),
  OTP_DELIVERY_MODE: z.enum(["console", "disabled"]).default("console"),
  RESEND_API_KEY: optionalNonEmptyString,
  RESEND_FROM_EMAIL: optionalNonEmptyString,
  DEV_QR_TOKEN: z.string().min(16).optional(),
  DEV_MERCHANT_PASSWORD: z.string().min(12).max(128).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

export function getEnv(): ServerEnv {
  if (!cachedEnv) {
    cachedEnv = serverEnvSchema.parse(process.env);
  }
  return cachedEnv;
}
