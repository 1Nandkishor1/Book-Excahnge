import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { nextId } from "../models/Counter.js";
import { signToken } from "../middleware/auth.js";
import { authDto, profileDto } from "../utils/dto.js";
import { HttpError, badRequest } from "../utils/errors.js";
import { validate, required, email, minLength } from "../utils/validate.js";

// Used so a login for an unknown email takes as long as a real one
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const clean = (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

export async function register(body) {
  validate(body, {
    fullName: [required("Full name is required")],
    email: [required("Email is required"), email("Email must be valid")],
    password: [required("Password is required"), minLength(6, "Password must be at least 6 characters")],
  });

  const emailNorm = body.email.trim().toLowerCase();
  if (await User.exists({ email: emailNorm })) throw badRequest("An account with this email already exists");

  const user = await User.create({
    _id: await nextId("users"),
    fullName: body.fullName.trim(),
    email: emailNorm,
    passwordHash: await bcrypt.hash(body.password, 10),
    phone: clean(body.phone),
    college: clean(body.college),
    department: clean(body.department),
  });
  return authDto(user, signToken(user));
}

export async function login(body) {
  validate(body, {
    email: [required("Email is required"), email("Email must be valid")],
    password: [required("Password is required")],
  });

  const user = await User.findOne({ email: body.email.trim().toLowerCase() });
  const ok = await bcrypt.compare(body.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, "Invalid email or password");
  return authDto(user, signToken(user));
}

export const getProfile = (user) => profileDto(user);

export async function updateProfile(user, body) {
  validate(body, { fullName: [required("Full name is required")] });
  user.fullName = body.fullName.trim();
  user.phone = clean(body.phone);
  user.college = clean(body.college);
  user.department = clean(body.department);
  await user.save();
  return profileDto(user);
}
