import api from "@/lib/api";
import { axiosErrorMessage } from "@/lib/axiosErrorMessage";

/** Fetch authenticated file and open in a new tab. */
export async function openAuthBlobUrl(path: string): Promise<void> {
  try {
    const { data } = await api.get<Blob>(path, { responseType: "blob" });
    const url = URL.createObjectURL(data);
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (!w) {
      window.alert?.("Allow pop-ups to view this file, or try again.");
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
  } catch (e) {
    window.alert?.(axiosErrorMessage(e, "Could not open the file."));
  }
}
