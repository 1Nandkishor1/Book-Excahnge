import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    _id: { type: Number },
    title: { type: String, required: true, trim: true },
    author: { type: String, default: null },
    subject: { type: String, default: null },
    course: { type: String, default: null },
    edition: { type: String, default: null },
    condition: { type: String, default: null },
    type: { type: String, enum: ["SELL", "SWAP"], required: true },
    price: { type: Number, default: null, min: 0 },
    description: { type: String, default: null, maxlength: 1000 },
    imageUrl: { type: String, default: null },
    available: { type: Boolean, default: true },
    seller: { type: Number, ref: "User", required: true, index: true },
  },
  { versionKey: false, timestamps: { createdAt: true, updatedAt: false } }
);

bookSchema.index({ available: 1, _id: 1 });

export const Book = mongoose.model("Book", bookSchema);
