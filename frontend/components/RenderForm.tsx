"use client";

import { FormEvent, useEffect, useState } from "react";
import { createRender, type RenderJob } from "@/lib/api";

const EXAMPLE_BRIEFS = [
  "Cocina moderna, madera clara, luz de tarde",
  "Salón nórdico, blancos y lino, luz suave de mañana",
  "Fachada contemporánea, hormigón visto, atardecer",
];

export default function RenderForm({ onCreated }: { onCreated: (job: RenderJob) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [brief, setBrief] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    const form = event.currentTarget;

    setSubmitting(true);
    setError(null);
    try {
      onCreated(await createRender(file, brief));
      form.reset();
      setFile(null);
      setBrief("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="panel render-form" onSubmit={handleSubmit}>
      <label className="dropzone">
        {preview ? (
          <img src={preview} alt="Vista previa de la imagen de referencia" />
        ) : (
          <span>
            <strong>Sube una vista de tu modelo</strong>
            <br />
            Exportación o captura de SketchUp, boceto o foto · JPG, PNG o WebP · máx. 5 MB
          </span>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>

      <div className="brief">
        <label htmlFor="brief">¿Qué quieres ver?</label>
        <textarea
          id="brief"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Cocina moderna, madera clara, luz de tarde"
          minLength={3}
          maxLength={2000}
          required
          rows={4}
        />
        <div className="chips">
          {EXAMPLE_BRIEFS.map((example) => (
            <button key={example} type="button" className="chip" onClick={() => setBrief(example)}>
              {example}
            </button>
          ))}
        </div>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="primary" disabled={submitting || !file}>
          {submitting ? "Enviando…" : "Generar render"}
        </button>
      </div>
    </form>
  );
}
