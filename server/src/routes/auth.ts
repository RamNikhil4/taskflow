import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { db } from "../config/db";
import { users } from "../db/schema/users";
import { refreshTokens } from "../db/schema/refreshTokens";
import { eq, and, gt } from "drizzle-orm";
import { z } from "zod";
import {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  hashToken,
} from "../utils/tokens";

const router = Router();

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

router.post("/signup", async (req: Request, res: Response): Promise<void> => {
  try {
    const body = signupSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({
        message: "Validation error",
        errors: body.error.flatten().fieldErrors,
      });
      return;
    }

    const { name, email, password } = body.data;

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    if (existing.length > 0) {
      res.status(409).json({ message: "Email already registered" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [newUser] = await db
      .insert(users)
      .values({ name, email, password: hashedPassword })
      .returning({ id: users.id, name: users.name, email: users.email });

    const accessToken = generateAccessToken(newUser.id);
    const refreshToken = await generateRefreshToken(newUser.id);
    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({ user: newUser });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({
        message: "Validation error",
        errors: body.error.flatten().fieldErrors,
      });
      return;
    }

    const { email, password } = body.data;

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = await generateRefreshToken(user.id);
    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/refresh", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawToken = req.cookies?.refreshToken;
    if (!rawToken) {
      res.status(401).json({ message: "No refresh token" });
      return;
    }

    const hashed = hashToken(rawToken);

    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token, hashed),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      );

    if (!stored) {
      clearAuthCookies(res);
      res.status(401).json({ message: "Invalid or expired refresh token" });
      return;
    }

    const accessToken = generateAccessToken(stored.userId);
    const newRefreshToken = await generateRefreshToken(stored.userId);
    setAuthCookies(res, accessToken, newRefreshToken);

    res.json({ message: "Token refreshed" });
  } catch (error) {
    console.error("Refresh error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/logout", async (req: Request, res: Response): Promise<void> => {
  try {
    const rawToken = req.cookies?.refreshToken;
    if (rawToken) {
      const hashed = hashToken(rawToken);
      await db.delete(refreshTokens).where(eq(refreshTokens.token, hashed));
    }
  } catch {}

  clearAuthCookies(res);
  res.json({ message: "Logged out successfully" });
});

export default router;
