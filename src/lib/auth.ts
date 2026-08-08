import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  verifySessionToken,
  getSessionFromRequest,
  SessionPayload,
} from "@/lib/session";

// Re-export session utilities (value exports)
export {
  SESSION_COOKIE_NAME,
  createSessionToken,
  verifySessionToken,
  getSessionFromRequest,
};

// Re-export type export (required by isolatedModules)
export type { SessionPayload };

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
