import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    _id: { type: Number },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, default: null },
    college: { type: String, default: null },
    department: { type: String, default: null },
  },
  { versionKey: false, timestamps: { createdAt: true, updatedAt: false } }
);

export const User = mongoose.model("User", userSchema);
