import { jwtVerify, SignJWT } from "jose";
import type { NextRequest, NextResponse } from "next/server";
import type { SessionUser } from "./types";

const COOKIE_NAME = "sapa_session";
const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || "local-development-secret-change-me-now");

export async function signSession(user: SessionUser) {
  return new SignJWT({ email: user.email, username: user.username, fullName: user.fullName })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || typeof payload.email !== "string") return null;
    return {
      id: payload.sub,
      email: payload.email,
      username: typeof payload.username === "string" ? payload.username : undefined,
      fullName: typeof payload.fullName === "string" ? payload.fullName : undefined,
    };
  } catch {
    return null;
  }
}

export async function userFromRequest(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const token = bearer || request.cookies.get(COOKIE_NAME)?.value;
  return token ? verifySession(token) : null;
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function requireUser(request: NextRequest) {
  const user = await userFromRequest(request);
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

