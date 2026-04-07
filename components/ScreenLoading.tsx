"use client";

import NotimeLoader from "@/components/NotimeLoader";

type Props = {
  message?: string;
  /** Use on light landing-style pages */
  subtle?: boolean;
};

/**
 * Full-viewport loading used for auth gates and post-login redirects.
 * Keeps copy and layout consistent across the app.
 */
export default function ScreenLoading({ message = "Loading…", subtle }: Props) {
  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center ${
        subtle ? "bg-[var(--bg)]" : ""
      }`}
    >
      <NotimeLoader size={56} label={message} />
    </div>
  );
}
