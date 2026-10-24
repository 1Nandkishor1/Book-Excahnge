import crypto from "node:crypto";
import path from "node:path";
import { Image } from "../models/Image.js";
import { IMAGE_EXT } from "../middleware/upload.js";
import { notFound } from "../utils/errors.js";

// Returns the public path the frontend stores in book.imageUrl, e.g. /uploads/<uuid>.png
export async function save(file) {
  const id = crypto.randomUUID();
  await Image.create({ _id: id, contentType: file.mimetype, data: file.buffer });
  return `/uploads/${id}${IMAGE_EXT[file.mimetype]}`;
}

export async function get(fileName) {
  const image = await Image.findById(path.parse(String(fileName)).name);
  if (!image) throw notFound("Image not found");
  return image;
}
