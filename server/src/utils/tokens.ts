import { Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "../config/db";
import { refreshTokens } from "../db/schema/refreshTokens";
import { eq } from "drizzle-orm";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const REFRESH_TOKEN_EXPIRY_MS = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;

export function generateAccessToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export async function generateRefreshToken(userId: string): Promise<string> {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));

  const raw = crypto.randomBytes(40).toString("hex");
  const hashed = hashToken(raw);

  await db.insert(refreshTokens).values({
    token: hashed,
    userId,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
  });

  return raw;
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: REFRESH_TOKEN_EXPIRY_MS,
    path: "/",
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  res.clearCookie("refreshToken", { path: "/api/auth" });
  res.clearCookie("refreshToken", { path: "/auth" });
}

export function hashToken(token: string): string {
  return crypto
    .createHmac("sha256", process.env.REFRESH_TOKEN_SECRET!)
    .update(token)
    .digest("hex");
}
