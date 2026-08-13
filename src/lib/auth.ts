import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  verifySessionToken,
  getSessionFromRequest,
  SessionPayload,
} from "@/lib/session";
import { prisma } from "@/lib/prisma";

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

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  phone: string | null;
  address: string | null;
  image: string | null;
};

/** Resolve the session cookie to the authoritative DB user (with role). */
export async function getAuthenticatedUser(
  request: Request
): Promise<AuthenticatedUser | null> {
  const session = await getSessionFromRequest(request);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      address: true,
      image: true,
    },
  });
  return user;
}
