import { Router, Response } from "express";
import { db } from "../config/db";
import { users } from "../db/schema/users";
import { eq } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { z } from "zod";

const router = Router();

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
});

// GET /user/profile
router.get(
  "/profile",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const [user] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, req.userId!));

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.json({ user });
    } catch (error) {
      console.error("Profile fetch error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

// PUT /user/profile
router.put(
  "/profile",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const body = updateProfileSchema.safeParse(req.body);
      if (!body.success) {
        res
          .status(400)
          .json({
            message: "Validation error",
            errors: body.error.flatten().fieldErrors,
          });
        return;
      }

      const [updated] = await db
        .update(users)
        .set({ ...body.data, updatedAt: new Date() })
        .where(eq(users.id, req.userId!))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
        });

      res.json({ user: updated });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

export default router;
