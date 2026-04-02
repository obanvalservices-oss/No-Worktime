export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureMasterUser } = await import("@/lib/ensureMasterUser");
    await ensureMasterUser().catch((e) => console.error("[bootstrap]", e));
  }
}
