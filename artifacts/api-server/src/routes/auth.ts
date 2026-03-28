import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signToken, requireAuth } from "../middleware/auth";

const router: IRouter = Router();

// Public: list all users (name/role only — used by devUser param)
router.get("/users", async (req, res): Promise<void> => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
      })
      .from(usersTable)
      .orderBy(usersTable.name);

    res.json(users);
  } catch (err) {
    req.log.error({ err }, "Failed to list users");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Public: login with username + password (production login form)
router.post("/auth/login-with-credentials", async (req, res): Promise<void> => {
  try {
    const { username, password, rememberMe } = req.body as {
      username?: string;
      password?: string;
      rememberMe?: boolean;
    };

    if (!username || typeof username !== "string" || !username.trim()) {
      res.status(400).json({ error: "Username is required" });
      return;
    }
    if (!password || typeof password !== "string") {
      res.status(400).json({ error: "Password is required" });
      return;
    }

    const usernameClean = username.trim().toLowerCase();

    const [user] = await db
      .select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.username, usernameClean),
          eq(usersTable.email, usernameClean),
        ),
      );

    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const token = signToken(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      rememberMe === true,
    );

    req.log.info({ userId: user.id, role: user.role, rememberMe }, "User logged in with credentials");

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to login with credentials");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Public: login by userId (used by ?devUser= query param — kept for backward compat)
router.post("/auth/login", async (req, res): Promise<void> => {
  try {
    const { userId } = req.body;

    if (!userId || typeof userId !== "number") {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const token = signToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to login");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Protected: return the current user's profile (used for session verification)
router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.id));

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get current user");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
