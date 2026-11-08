"use client";

import { FormEvent, useId, useRef, useState } from "react";
import MaskCanvas, { type MaskHandle } from "@/components/MaskCanvas";

const EXAMPLE_EDITS = [
  "Cambia solo el piso por porcelanato gris claro",
  "Pinta la pared del fondo de verde salvia",
  "Agrega plantas grandes junto a la ventana",
];

export default function EditPanel({
  imageUrl,
  onSubmit,
  onCancel,
}: {
  imageUrl: string;
  onSubmit: (instruction: string, mask: Blob | null) => Promise<void>;
  onCancel: () => void;
}) {
  const id = useId();
  const mask = useRef<MaskHandle>(null);
  const [instruction, setInstruction] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const blob = await mask.current?.toMask();
      await onSubmit(instruction.trim(), blob ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <form className="edit-panel" onSubmit={handleSubmit}>
      <MaskCanvas ref={mask} imageUrl={imageUrl} />
      <div className="edit-form">
        <label htmlFor={`${id}-instruction`}>¿Qué quieres cambiar?</label>
        <textarea
          id={`${id}-instruction`}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder={EXAMPLE_EDITS[0]}
          minLength={3}
          maxLength={500}
          required
          rows={2}
          autoFocus
        />
        <div className="chips">
          {EXAMPLE_EDITS.map((example) => (
            <button key={example} type="button" className="chip" onClick={() => setInstruction(example)}>
              {example}
            </button>
          ))}
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="edit-actions">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={submitting || instruction.trim().length < 3}>
            {submitting ? "Enviando…" : "Aplicar cambio"}
          </button>
        </div>
      </div>
    </form>
  );
}
