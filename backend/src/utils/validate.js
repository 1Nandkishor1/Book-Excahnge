import { ValidationFailure } from "./errors.js";

export const required = (msg) => (v) =>
  v === undefined || v === null || (typeof v === "string" && v.trim() === "") ? msg : null;

export const email = (msg) => (v) =>
  typeof v === "string" && v.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? msg : null;

export const minLength = (n, msg) => (v) => (typeof v === "string" && v.length < n ? msg : null);
export const maxLength = (n, msg) => (v) => (typeof v === "string" && v.length > n ? msg : null);
export const oneOf = (list, msg) => (v) => (v !== undefined && v !== null && !list.includes(v) ? msg : null);
export const nonNegativeNumber = (msg) => (v) =>
  v !== undefined && v !== null && v !== "" && !(Number.isFinite(Number(v)) && Number(v) >= 0) ? msg : null;

// spec = { field: [check, check, ...] }. The first failing check per field wins.
export function validate(body, spec) {
  const errors = {};
  for (const [field, checks] of Object.entries(spec)) {
    for (const check of checks) {
      const msg = check(body?.[field], body);
      if (msg) {
        errors[field] = msg;
        break;
      }
    }
  }
  if (Object.keys(errors).length) throw new ValidationFailure(errors);
}
