import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as users from "../services/userService.js";

const router = Router();
router.use(requireAuth);
router.get("/profile", (req, res) => res.json(users.getProfile(req.user)));
router.put("/profile", async (req, res) => res.json(await users.updateProfile(req.user, req.body)));
export default router;
