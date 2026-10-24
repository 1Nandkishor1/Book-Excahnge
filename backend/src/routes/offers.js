import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as offers from "../services/offerService.js";
import { parseId } from "../utils/errors.js";

const router = Router();
router.use(requireAuth);

router.post("/", async (req, res) => res.json(await offers.createOffer(req.body, req.user)));
router.get("/", async (req, res) => res.json(await offers.getMyOffers(req.user)));
router.get("/received", async (req, res) => res.json(await offers.getOffersReceived(req.user)));
router.put("/:id/accept", async (req, res) =>
  res.json(await offers.accept(parseId(req.params.id, "Offer"), req.user))
);
router.put("/:id/reject", async (req, res) =>
  res.json(await offers.reject(parseId(req.params.id, "Offer"), req.user))
);

export default router;
