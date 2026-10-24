// Turns any Axios error into one readable sentence.
export function errorMessage(err, fallback = "Something went wrong. Try again.") {
  const data = err?.response?.data;
  if (!data) {
    return err?.message === "Network Error"
      ? "Can't reach the server. Check that the backend is running."
      : fallback;
  }
  if (typeof data === "string") return data;
  if (data.message) return data.message;
  // Spring validation errors arrive as { field: "message" }
  const first = Object.values(data)[0];
  return typeof first === "string" ? first : fallback;
}
