import { hash, verify } from "@node-rs/argon2";

// OWASP-recommended Argon2id minimums (19 MiB, t=2, p=1)
const ARGON2_OPTS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTS);
}

export function verifyPassword(
  passwordHash: string,
  password: string
): Promise<boolean> {
  return verify(passwordHash, password, ARGON2_OPTS);
}

export function passwordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 12) issues.push("Must be at least 12 characters");
  if (password.length > 128) issues.push("Must be at most 128 characters");
  if (!/[a-zA-Z]/.test(password)) issues.push("Must contain a letter");
  if (!/[0-9]/.test(password)) issues.push("Must contain a digit");
  return issues;
}
