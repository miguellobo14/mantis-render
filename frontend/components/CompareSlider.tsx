"use client";

import { useState } from "react";

/** Before/after with a draggable divider. The range input on top gives mouse, touch and keyboard for free. */
export default function CompareSlider({
  before,
  after,
  beforeLabel = "Antes",
  afterLabel = "Después",
}: {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
}) {
  const [position, setPosition] = useState(50);

  return (
    <div className="compare-slider">
      <img className="compare-after" src={after} alt={afterLabel} />
      <img
        className="compare-before"
        src={before}
        alt={beforeLabel}
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      />
      <span className="compare-tag compare-tag-before">{beforeLabel}</span>
      <span className="compare-tag compare-tag-after">{afterLabel}</span>
      <span className="compare-line" style={{ left: `${position}%` }}>
        <span className="compare-grip" />
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={position}
        aria-label={`Comparar ${beforeLabel} y ${afterLabel}`}
        onChange={(e) => setPosition(Number(e.target.value))}
      />
    </div>
  );
}
