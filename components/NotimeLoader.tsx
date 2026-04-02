"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

type Props = {
  className?: string;
  size?: number;
  /** Accessibility label; omit when `decorative` */
  label?: string;
  /** Hides from assistive tech (e.g. inline in a button that already has text) */
  decorative?: boolean;
};

/**
 * Brand loading mark: prefers `/notime-loader.png` (place your PNG in `public/`).
 * Falls back to `/notime-loader.svg` if the PNG is missing.
 */
export default function NotimeLoader({
  className = "",
  size = 56,
  label = "Loading",
  decorative = false,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [useSvg, setUseSvg] = useState(false);
  const src = useSvg ? "/notime-loader.svg" : "/notime-loader.png";

  return (
    <motion.div
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      animate={reduceMotion ? {} : { rotate: 360 }}
      transition={{
        duration: 2.8,
        repeat: reduceMotion ? 0 : Infinity,
        ease: "linear",
      }}
      role={decorative ? "presentation" : "status"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className="size-full object-contain select-none"
        draggable={false}
        onError={() => setUseSvg(true)}
      />
    </motion.div>
  );
}
