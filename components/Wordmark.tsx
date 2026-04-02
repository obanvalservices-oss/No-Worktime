import { BRAND_NAME } from "@/lib/brand";

type Props = { className?: string; size?: "sm" | "md" | "lg" };

/**
 * “NO” in deep brand teal, “Worktime” in primary text color (charcoal / light).
 */
export default function Wordmark({ className = "", size = "md" }: Props) {
  const textSize =
    size === "lg"
      ? "text-xl sm:text-2xl"
      : size === "sm"
        ? "text-sm sm:text-base"
        : "text-lg";
  const parts = BRAND_NAME.split(" ");
  const no = parts[0] ?? "NO";
  const rest = parts.slice(1).join(" ");

  return (
    <span className={`font-semibold tracking-tight ${textSize} ${className}`}>
      <span className="text-[var(--accent-deep)]">{no}</span>
      {rest ? <span className="text-[var(--text)]"> {rest}</span> : null}
    </span>
  );
}
