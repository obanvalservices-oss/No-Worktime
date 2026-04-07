import axios from "axios";

export function axiosErrorMessage(
  e: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (axios.isAxiosError(e)) {
    const m = (e.response?.data as { message?: string })?.message;
    if (typeof m === "string" && m.trim()) return m.trim();
  }
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}
