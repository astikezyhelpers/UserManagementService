import dotenv from "dotenv";

dotenv.config({ path: "../.env"});

const requiredEnvs = ["JWT_SECRET", "REFRESH_JWT_SECRET", "VERIFICATION_TTL"];

for (const env of requiredEnvs) {
  if (!process.env[env] || String(process.env[env]).trim() === "") {
    throw new Error(`Missing required environment variable: ${env}`);
  }
}

export const JWT_SECRET = process.env.JWT_SECRET;
export const REFRESH_JWT_SECRET = process.env.REFRESH_JWT_SECRET;
export const VERIFICATION_TTL = parseInt(process.env.VERIFICATION_TTL, 10);
export const EMAIL_USER = process.env.EMAIL_USER;
export const EMAIL_PASS = process.env.EMAIL_PASS;


if (isNaN(VERIFICATION_TTL) || VERIFICATION_TTL <= 0) {
  throw new Error(" VERIFICATION_TTL must be a positive number");
}
