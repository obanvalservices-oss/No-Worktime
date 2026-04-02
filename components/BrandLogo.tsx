"use client";

import { useState } from "react";

type Props = {
  className?: string;
  size?: number;
};

const LOGO_SOURCES = [
  "/notime-loader.png",
  "/notime-loader.svg",
  "/logo.svg",
] as const;

/**
 * Brand mark: `public/notime-loader.png`, then SVG fallbacks if missing.
 */
export default function BrandLogo({ className = "", size = 44 }: Props) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const src = LOGO_SOURCES[sourceIndex] ?? LOGO_SOURCES[0];

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      onError={() =>
        setSourceIndex((i) =>
          i < LOGO_SOURCES.length - 1 ? i + 1 : i
        )
      }
    />
  );
}
