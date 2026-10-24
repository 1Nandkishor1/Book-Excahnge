import mongoose from "mongoose";

// Sequential numeric ids (1, 2, 3...) keep the API identical to the old Spring backend,
// which the React frontend relies on (it sorts and compares ids as numbers).
const counterSchema = new mongoose.Schema(
  { _id: { type: String }, seq: { type: Number, default: 0 } },
  { versionKey: false }
);

export const Counter = mongoose.model("Counter", counterSchema);

export async function nextId(name) {
  const doc = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}
