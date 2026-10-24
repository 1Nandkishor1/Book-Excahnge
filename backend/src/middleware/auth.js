import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { User } from "../models/User.js";
import { unauthorized } from "../utils/errors.js";

export function signToken(user) {
  return jwt.sign({ sub: String(user._id) }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

// Returns the User for a raw JWT, or throws a 401 HttpError. Shared by HTTP and the STOMP socket.
export async function userFromToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw unauthorized("Invalid or expired token");
  }
  const user = await User.findById(Number(payload.sub));
  if (!user) throw unauthorized("Invalid or expired token");
  return user;
}

export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) throw unauthorized("Authentication required");
  req.user = await userFromToken(header.slice(7));
  next();
}
