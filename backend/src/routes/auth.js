import { Router } from "express";
import * as users from "../services/userService.js";

const router = Router();
router.post("/register", async (req, res) => res.json(await users.register(req.body)));
router.post("/login", async (req, res) => res.json(await users.login(req.body)));
export default router;
