import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    _id: { type: Number },
    content: { type: String, required: true, maxlength: 2000 },
    time: { type: Date, default: Date.now },
    seen: { type: Boolean, default: false },
    sender: { type: Number, ref: "User", required: true },
    receiver: { type: Number, ref: "User", required: true },
    offer: { type: Number, ref: "Offer", required: true },
  },
  { versionKey: false }
);

messageSchema.index({ offer: 1, time: 1, _id: 1 });

export const Message = mongoose.model("Message", messageSchema);
