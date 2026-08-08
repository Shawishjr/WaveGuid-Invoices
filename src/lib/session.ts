import jwt from "jsonwebtoken";

export const SESSION_COOKIE_NAME = "waveguid.session";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me-in-production";

export interface SessionPayload {
  userId: string;
  email: string;
  name?: string | null;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionPayload;
    return decoded;
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(request: Request): Promise<SessionPayload | null> {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookieStore = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [name, ...v] = c.trim().split("=");
      return [name, v.join("=")];
    })
  );

  const token = cookieStore[SESSION_COOKIE_NAME];
  if (!token) return null;
  return verifySessionToken(token);
}
