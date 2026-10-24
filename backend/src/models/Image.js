import mongoose from "mongoose";

// Uploaded book photos are stored in MongoDB, not on disk.
// Hosts like Render wipe the server's disk on every deploy and idle restart; the database survives.
const imageSchema = new mongoose.Schema(
  {
    _id: { type: String }, // random uuid, also the file name in the public URL
    contentType: { type: String, required: true },
    data: { type: Buffer, required: true },
  },
  { versionKey: false, timestamps: { createdAt: true, updatedAt: false } }
);

export const Image = mongoose.model("Image", imageSchema);
