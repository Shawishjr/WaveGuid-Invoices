import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  comparePassword,
  createSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const email = params.get("email") || "";
    const password = params.get("password") || "";
    const callbackUrl = params.get("callbackUrl") || "/";

    if (!email || !password) {
      return NextResponse.redirect(
        new URL("/login?error=" + encodeURIComponent("Email and password are required"), request.url)
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.redirect(
        new URL("/login?error=" + encodeURIComponent("Invalid email or password"), request.url)
      );
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return NextResponse.redirect(
        new URL("/login?error=" + encodeURIComponent("Invalid email or password"), request.url)
      );
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.redirect(new URL(callbackUrl, request.url));
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
      new URL("/login?error=" + encodeURIComponent("Something went wrong"), request.url)
    );
  }
}
