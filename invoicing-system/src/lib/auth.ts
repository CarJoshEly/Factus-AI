import { createHmac, scryptSync, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

const COOKIE_NAME = "factusai_session";
const SECRET = process.env.AUTH_SECRET ?? "factusai_default_secret";
const SALT = SECRET.slice(0, 16);
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

function signValue(value: string) {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

export function hashPassword(password: string) {
  return scryptSync(password, SALT, 64).toString("hex");
}

export function verifyPassword(password: string, hashed: string) {
  const candidate = Buffer.from(hashPassword(password), "hex");
  const actual = Buffer.from(hashed, "hex");

  if (candidate.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(candidate, actual);
}

export function createSessionValue(userId: number) {
  const payload = `${userId}:${Date.now()}`;
  const signature = signValue(payload);
  return `${payload}.${signature}`;
}

export function parseSessionValue(value: string) {
  const separator = value.lastIndexOf(".");
  if (separator === -1) {
    return null;
  }

  const payload = value.slice(0, separator);
  const signature = value.slice(separator + 1);

  if (!payload || !signature) {
    return null;
  }

  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(signValue(payload)))) {
    return null;
  }

  const [userIdString] = payload.split(":");
  const userId = Number(userIdString);

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  return { userId };
}

export function setSessionCookie(response: NextResponse, userId: number) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: createSessionValue(userId),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
