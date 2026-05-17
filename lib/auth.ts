import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "filebucket_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  email: string;
  expiresAt: number;
};

export type AuthSession = {
  email: string;
};

function getAuthSecret() {
  const secret = process.env.FILEBUCKET_AUTH_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("FILEBUCKET_AUTH_SECRET is required in production.");
  }

  return secret ?? "development-only-filebucket-secret";
}

function getConfiguredUser() {
  const email = process.env.FILEBUCKET_ADMIN_EMAIL ?? "admin@filebucket.local";
  const password = process.env.FILEBUCKET_ADMIN_PASSWORD ?? "password";

  if (
    process.env.NODE_ENV === "production" &&
    (!process.env.FILEBUCKET_ADMIN_EMAIL || !process.env.FILEBUCKET_ADMIN_PASSWORD)
  ) {
    throw new Error("FILEBUCKET_ADMIN_EMAIL and FILEBUCKET_ADMIN_PASSWORD are required in production.");
  }

  return { email, password };
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function createSessionToken(payload: SessionPayload) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function readSessionToken(token?: string): AuthSession | null {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature || !safeCompare(signature, sign(encodedPayload))) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;

    if (!payload.email || payload.expiresAt < Date.now()) {
      return null;
    }

    return { email: payload.email };
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  return readSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function authenticate(email: string, password: string) {
  const user = getConfiguredUser();

  if (email !== user.email || password !== user.password) {
    return false;
  }

  const cookieStore = await cookies();
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;

  cookieStore.set({
    name: SESSION_COOKIE,
    value: createSessionToken({ email: user.email, expiresAt }),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS
  });

  return true;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
