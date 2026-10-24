import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as messages from "../services/messageService.js";
import { broker } from "../realtime/stomp.js";
import { parseId } from "../utils/errors.js";

const router = Router();
router.use(requireAuth);

router.get("/:offerId", async (req, res) =>
  res.json(await messages.getMessagesForOffer(parseId(req.params.offerId, "Offer"), req.user))
);

// REST fallback for sending. The saved message is also pushed to anyone listening on the socket.
router.post("/", async (req, res) => {
  const saved = await messages.sendMessage(req.body, req.user);
  broker.publish(`/topic/offer/${saved.offerId}`, saved);
  res.json(saved);
});

export default router;
