import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  comparePassword,
  createSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

function origin(request: Request) {
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("host");
  return host ? `${proto}://${host}` : request.url;
}

export async function POST(request: Request) {
  const base = origin(request);
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const email = params.get("email") || "";
    const password = params.get("password") || "";
    const callbackUrl = params.get("callbackUrl") || "/";

    if (!email || !password) {
      return NextResponse.redirect(
        new URL(
          "/login?error=" + encodeURIComponent("Email and password are required"),
          base
        )
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.redirect(
        new URL(
          "/login?error=" + encodeURIComponent("Invalid email or password"),
          base
        )
      );
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return NextResponse.redirect(
        new URL(
          "/login?error=" + encodeURIComponent("Invalid email or password"),
          base
        )
      );
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.redirect(new URL(callbackUrl, base));
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.redirect(
      new URL(
        "/login?error=" + encodeURIComponent("Something went wrong"),
        base
      )
    );
  }
}
