import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    _id: { type: Number },
    offerType: { type: String, enum: ["BUY", "SWAP"], required: true },
    offeredPrice: { type: Number, default: null, min: 0 },
    swapBookDescription: { type: String, default: null },
    status: { type: String, enum: ["PENDING", "ACCEPTED", "REJECTED"], default: "PENDING" },
    buyer: { type: Number, ref: "User", required: true, index: true },
    book: { type: Number, ref: "Book", required: true, index: true },
  },
  { versionKey: false, timestamps: { createdAt: true, updatedAt: false } }
);

export const Offer = mongoose.model("Offer", offerSchema);
