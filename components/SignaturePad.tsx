"use client";

import {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  type PointerEvent as ReactPointerEvent,
} from "react";

export type SignaturePadHandle = {
  clear: () => void;
  toDataURL: () => string | null;
};

const SignaturePad = forwardRef<SignaturePadHandle>(function SignaturePad(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const w = 400;
    const h = 160;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const pos = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      last.current = null;
    },
    toDataURL: () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      try {
        return canvas.toDataURL("image/png");
      } catch {
        return null;
      }
    },
  }));

  const start = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawing.current = true;
    last.current = pos(e);
  };

  const end = () => {
    drawing.current = false;
    last.current = null;
  };

  const move = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !last.current) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  return (
    <canvas
      ref={canvasRef}
      className="touch-none rounded-lg border border-[var(--border)] bg-white cursor-crosshair max-w-full"
      width={400}
      height={160}
      onPointerDown={start}
      onPointerUp={end}
      onPointerLeave={end}
      onPointerCancel={end}
      onPointerMove={move}
    />
  );
});

export default SignaturePad;
