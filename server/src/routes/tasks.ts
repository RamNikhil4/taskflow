import { Router, Response } from "express";
import { db } from "../config/db";
import { tasks } from "../db/schema/tasks";
import { eq, and, ilike, or, desc } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { z } from "zod";

const router = Router();

// All task routes require authentication
router.use(authMiddleware);

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  status: z.enum(["pending", "in-progress", "completed"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

const updateTaskSchema = createTaskSchema.partial();

// GET /tasks — list all tasks for the authenticated user
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, status, priority } = req.query;

    let query = db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, req.userId!))
      .orderBy(desc(tasks.createdAt))
      .$dynamic();

    // Apply filters
    const conditions = [eq(tasks.userId, req.userId!)];

    if (status && typeof status === "string") {
      conditions.push(eq(tasks.status, status));
    }
    if (priority && typeof priority === "string") {
      conditions.push(eq(tasks.priority, priority));
    }

    if (search && typeof search === "string") {
      conditions.push(
        or(
          ilike(tasks.title, `%${search}%`),
          ilike(tasks.description, `%${search}%`),
        )!,
      );
    }

    const result = await db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(desc(tasks.createdAt));

    res.json({ tasks: result });
  } catch (error) {
    console.error("Tasks fetch error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /tasks — create a new task
router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = createTaskSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({
        message: "Validation error",
        errors: body.error.flatten().fieldErrors,
      });
      return;
    }

    const [task] = await db
      .insert(tasks)
      .values({ ...body.data, userId: req.userId! })
      .returning();

    res.status(201).json({ task });
  } catch (error) {
    console.error("Task create error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// PUT /tasks/:id — update a task
router.put("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = updateTaskSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({
        message: "Validation error",
        errors: body.error.flatten().fieldErrors,
      });
      return;
    }

    const [task] = await db
      .update(tasks)
      .set({ ...body.data, updatedAt: new Date() })
      .where(
        and(eq(tasks.id, String(req.params.id)), eq(tasks.userId, req.userId!)),
      )
      .returning();

    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    res.json({ task });
  } catch (error) {
    console.error("Task update error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE /tasks/:id — delete a task
router.delete(
  "/:id",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const [task] = await db
        .delete(tasks)
        .where(
          and(
            eq(tasks.id, String(req.params.id)),
            eq(tasks.userId, req.userId!),
          ),
        )
        .returning();

      if (!task) {
        res.status(404).json({ message: "Task not found" });
        return;
      }

      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Task delete error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

export default router;
