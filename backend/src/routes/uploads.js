import { Router } from "express";
import * as images from "../services/imageService.js";

const router = Router();

// Public, and cached for a year: an image's uuid never changes content
router.get("/:file", async (req, res) => {
  const image = await images.get(req.params.file);
  res.set({
    "Content-Type": image.contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  res.send(image.data);
});

export default router;
