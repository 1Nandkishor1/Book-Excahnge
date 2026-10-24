import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import * as books from "../services/bookService.js";
import * as images from "../services/imageService.js";
import { badRequest, parseId } from "../utils/errors.js";

const router = Router();

// Public: browsing and searching. Everything else needs a token.
router.get("/", async (_req, res) => res.json(await books.getAllAvailable()));
router.get("/search", async (req, res) => res.json(await books.search(req.query)));

// These fixed paths must stay above "/:id"
router.get("/mine", requireAuth, async (req, res) => res.json(await books.getMine(req.user)));
router.post("/upload-image", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) throw badRequest("No file uploaded");
  res.json({ imageUrl: await images.save(req.file) });
});

router.get("/:id", async (req, res) => res.json(await books.getById(parseId(req.params.id, "Book listing"))));
router.post("/", requireAuth, async (req, res) => res.json(await books.create(req.body, req.user)));
router.put("/:id", requireAuth, async (req, res) =>
  res.json(await books.update(parseId(req.params.id, "Book listing"), req.body, req.user))
);
router.delete("/:id", requireAuth, async (req, res) => {
  await books.remove(parseId(req.params.id, "Book listing"), req.user);
  res.status(204).end();
});

export default router;
