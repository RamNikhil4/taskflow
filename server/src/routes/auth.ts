import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../config/db";
import { users } from "../db/schema/users";
import { eq } from "drizzle-orm";
import { z } from "zod";

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

// POST /auth/signup
router.post("/signup", async (req: Request, res: Response): Promise<void> => {
  try {
    const body = signupSchema.safeParse(req.body);
    if (!body.success) {
      res
        .status(400)
        .json({
          message: "Validation error",
          errors: body.error.flatten().fieldErrors,
        });
      return;
    }

    const { name, email, password } = body.data;

    // Check if user already exists
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

    const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET!, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ user: newUser, token });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /auth/login
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) {
      res
        .status(400)
        .json({
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

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: { id: user.id, name: user.name, email: user.email },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /auth/logout
router.post("/logout", (_req: Request, res: Response): void => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
});

export default router;
