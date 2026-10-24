// Business-rule errors use 400 on purpose. The frontend logs the user out on any
// 401/403 for a request that carried a token, so never use those for "you can't do that".
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Field validation failures: responded to as { field: "message" } (the shape Spring used)
export class ValidationFailure extends Error {
  constructor(fields) {
    super("Validation failed");
    this.fields = fields;
  }
}

export const badRequest = (m) => new HttpError(400, m);
export const notFound = (m) => new HttpError(404, m);
export const unauthorized = (m) => new HttpError(401, m);

export function parseId(value, what = "Resource") {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw notFound(`${what} not found with id: ${value}`);
  return n;
}
