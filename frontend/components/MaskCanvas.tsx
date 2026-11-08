"use client";

import { type PointerEvent, type Ref, useEffect, useImperativeHandle, useRef, useState } from "react";

export interface MaskHandle {
  /** The painted area as a black-and-white PNG the size of the image (white = change), or null if nothing is painted. */
  toMask(): Promise<Blob | null>;
}

// Strokes are drawn in the brand color for the preview; the exported mask is pure white on black.
const STROKE_COLOR = "rgba(76, 175, 80, 1)";

export default function MaskCanvas({
  imageUrl,
  ref,
  onPaintedChange,
}: {
  imageUrl: string;
  ref?: Ref<MaskHandle>;
  onPaintedChange?: (painted: boolean) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [brush, setBrush] = useState(40);
  const [painted, setPainted] = useState(false);

  // The version is usually already in the browser cache, so it can finish loading before onLoad is attached.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth) setSize({ w: img.naturalWidth, h: img.naturalHeight });
  }, [imageUrl]);

  function markPainted(value: boolean) {
    setPainted(value);
    onPaintedChange?.(value);
  }

  // Canvas pixels match the image's natural size, so the mask lines up with what fal.ai receives.
  function point(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    return { x: (event.clientX - rect.left) * scale, y: (event.clientY - rect.top) * scale, scale };
  }

  function stroke(from: { x: number; y: number }, to: { x: number; y: number }, scale: number) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = STROKE_COLOR;
    ctx.lineWidth = brush * scale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = point(event);
    stroke(p, p, p.scale);
    last.current = p;
    if (!painted) markPainted(true);
  }

  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!last.current) return;
    const p = point(event);
    stroke(last.current, p, p.scale);
    last.current = p;
  }

  function onPointerUp() {
    last.current = null;
  }

  function clear() {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    markPainted(false);
  }

  useImperativeHandle(ref, () => ({
    async toMask() {
      const canvas = canvasRef.current;
      if (!canvas || !painted) return null;
      const src = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
      const out = document.createElement("canvas");
      out.width = canvas.width;
      out.height = canvas.height;
      const outCtx = out.getContext("2d")!;
      const mask = outCtx.createImageData(canvas.width, canvas.height);
      for (let i = 0; i < src.data.length; i += 4) {
        const value = src.data[i + 3] > 0 ? 255 : 0;
        mask.data[i] = mask.data[i + 1] = mask.data[i + 2] = value;
        mask.data[i + 3] = 255;
      }
      outCtx.putImageData(mask, 0, 0);
      return new Promise((resolve) => out.toBlob(resolve, "image/png"));
    },
  }));

  return (
    <div className="mask-editor">
      <div className="mask-stage">
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Versión a editar"
          onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        />
        {size && (
          <canvas
            ref={canvasRef}
            width={size.w}
            height={size.h}
            aria-label="Pinta la zona que quieres cambiar"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        )}
      </div>
      <div className="mask-tools">
        <span>Opcional: pinta sobre la imagen la zona exacta.</span>
        <label>
          Pincel
          <input
            type="range"
            min={10}
            max={120}
            value={brush}
            onChange={(e) => setBrush(Number(e.target.value))}
          />
        </label>
        <button type="button" className="link-button" onClick={clear} disabled={!painted}>
          Borrar lo pintado
        </button>
      </div>
    </div>
  );
}
