"use client";

import { useEffect, useState } from "react";
import CompareSlider from "@/components/CompareSlider";
import EditPanel from "@/components/EditPanel";
import Icon from "@/components/Icon";
import { editRender, isBusy, type RenderJob, upscaleRender } from "@/lib/api";
import { styleLabel, toolById } from "@/lib/catalog";
import { downloadImage } from "@/lib/images";

export interface Selection {
  rootId: string;
  jobId: string;
  index: number;
}

interface StripItem {
  key: string;
  job: RenderJob;
  index: number;
  url: string | null;
  label: string;
}

function stripItems(root: RenderJob): StripItem[] {
  const versions: StripItem[] =
    root.result_urls.length > 0
      ? root.result_urls.map((url, index) => ({
          key: `${root.id}-${index}`,
          job: root,
          index,
          url,
          label: root.result_urls.length > 1 ? `Versión ${index + 1}` : "Render",
        }))
      : [{ key: root.id, job: root, index: 0, url: null, label: "Render" }];
  const derived = root.derived.map((job) => ({
    key: job.id,
    job,
    index: 0,
    url: job.result_url,
    label: job.kind === "upscale" ? "4K" : "Cambio",
  }));
  return [...versions, ...derived];
}

function progressSteps(job: RenderJob): { label: string; state: "done" | "active" | "pending" }[] {
  if (job.kind === "upscale") return [{ label: "Mejorando a 4K", state: "active" }];
  const understood = job.render_prompt !== null;
  const first = job.kind === "edit" ? "Entendiendo el cambio" : "Entendiendo tu imagen y tu pedido";
  const second =
    job.kind === "edit" ? "Aplicando el cambio" : job.variants > 1 ? `Generando ${job.variants} versiones` : "Generando el render";
  return [
    { label: first, state: understood ? "done" : "active" },
    { label: second, state: understood ? "active" : "pending" },
  ];
}

function Progress({ job }: { job: RenderJob }) {
  return (
    <div className="viewer-stage is-progress">
      <img src={job.input_url} alt="Imagen de partida" />
      <div className="progress-card" role="status">
        <span className="spinner" />
        <ol>
          {progressSteps(job).map((step) => (
            <li key={step.label} className={`step-${step.state}`}>
              {step.state === "done" && <Icon name="check" size={15} />}
              {step.label}
            </li>
          ))}
        </ol>
        <small>
          {job.status === "queued" && job.attempts > 0
            ? "Hubo un problema pasajero. Lo estamos reintentando."
            : "Suele tardar entre unos segundos y un par de minutos. Puedes seguir trabajando."}
        </small>
      </div>
    </div>
  );
}

export default function JobViewer({
  root,
  selection,
  onSelect,
  onNew,
  onChanged,
  onRetry,
}: {
  root: RenderJob;
  selection: Selection;
  onSelect: (selection: Selection) => void;
  onNew: () => void;
  onChanged: (created?: RenderJob) => void;
  onRetry: (job: RenderJob) => void;
}) {
  const job = root.id === selection.jobId ? root : (root.derived.find((d) => d.id === selection.jobId) ?? root);
  const index = Math.min(selection.index, Math.max(job.result_urls.length - 1, 0));
  const url = job.result_urls[index] ?? null;
  const items = stripItems(root);

  const [editing, setEditing] = useState(false);
  const [comparing, setComparing] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [upscaling, setUpscaling] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setEditing(false);
    setActionError(null);
  }, [selection.jobId, selection.index]);

  const canDerive = job.status === "done" && job.kind !== "upscale" && url !== null;

  async function upscale() {
    setUpscaling(true);
    setActionError(null);
    try {
      onChanged(await upscaleRender(job.id, index));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setUpscaling(false);
    }
  }

  async function download() {
    if (!url) return;
    setDownloading(true);
    setActionError(null);
    try {
      await downloadImage(url, `mantis-render-${job.id.slice(0, 8)}-${index + 1}.jpg`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setDownloading(false);
    }
  }

  const tags = [
    toolById(root.mode).label,
    root.style ? styleLabel(root.style) : null,
    root.reference_url ? "Con referencia" : null,
  ].filter(Boolean);

  return (
    <div className="viewer">
      <header className="viewer-head">
        <div className="viewer-title">
          <h1>{job.kind === "render" ? root.brief : job.kind === "edit" ? job.brief : "Mejora a 4K"}</h1>
          <p>
            {tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={onNew}>
          <Icon name="plus" size={16} /> Nuevo render
        </button>
      </header>

      {job.status === "done" && url && (
        <div className="toolbar" role="toolbar" aria-label="Herramientas de la imagen">
          {job.kind !== "upscale" && (
            <button
              type="button"
              className={`tool-btn ${comparing && !editing ? "is-active" : ""}`}
              aria-pressed={comparing && !editing}
              onClick={() => {
                setEditing(false);
                setComparing(!comparing || editing);
              }}
            >
              <Icon name="compare" size={18} /> Comparar
            </button>
          )}
          {canDerive && (
            <>
              <button
                type="button"
                className={`tool-btn ${editing ? "is-active" : ""}`}
                aria-pressed={editing}
                onClick={() => setEditing(!editing)}
              >
                <Icon name="brush" size={18} /> Editar
              </button>
              <button type="button" className="tool-btn" onClick={upscale} disabled={upscaling}>
                <span className="tool-4k">4K</span> {upscaling ? "Enviando…" : "Mejorar a 4K"}
              </button>
            </>
          )}
          <button type="button" className="tool-btn" onClick={download} disabled={downloading}>
            <Icon name="download" size={18} /> {downloading ? "Descargando…" : "Descargar"}
          </button>
        </div>
      )}
      {actionError && <p className="form-error">{actionError}</p>}

      {isBusy(job) && <Progress job={job} />}

      {job.status === "failed" && (
        <div className="viewer-stage is-failed">
          <img src={job.input_url} alt="Imagen de partida" />
          <div className="failed-card" role="alert">
            <Icon name="alert" size={22} />
            <strong>No se pudo completar</strong>
            <p>{job.error}</p>
            <button type="button" className="btn-primary" onClick={() => onRetry(job)}>
              Intentar de nuevo
            </button>
          </div>
        </div>
      )}

      {job.status === "done" && url && !editing && (
        <div className="viewer-stage">
          {comparing && job.kind !== "upscale" ? (
            <CompareSlider
              key={url}
              before={job.input_url}
              after={url}
              beforeLabel={job.kind === "edit" ? "Antes" : "Tu imagen"}
              afterLabel={job.kind === "edit" ? "Después" : "Render"}
            />
          ) : (
            <img className="viewer-image" src={url} alt={`Render: ${root.brief}`} />
          )}
        </div>
      )}

      {editing && url && (
        <EditPanel
          imageUrl={url}
          onCancel={() => setEditing(false)}
          onSubmit={async (instruction, mask) => {
            onChanged(await editRender(job.id, index, instruction, mask));
          }}
        />
      )}

      {items.length > 1 && (
        <div className="filmstrip" aria-label="Versiones y cambios">
          {items.map((item) => {
            const active = item.job.id === job.id && item.index === index;
            return (
              <button
                key={item.key}
                type="button"
                className={`film-item ${active ? "is-active" : ""}`}
                aria-current={active ? "true" : undefined}
                onClick={() => onSelect({ rootId: root.id, jobId: item.job.id, index: item.index })}
              >
                <span className="film-thumb">
                  {item.url ? (
                    <img src={item.url} alt="" />
                  ) : item.job.status === "failed" ? (
                    <Icon name="alert" size={18} />
                  ) : (
                    <span className="spinner spinner-small" />
                  )}
                </span>
                <span className="film-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {(job.claude_notes || job.render_prompt) && !editing && (
        <details className="viewer-notes" open={job.claude_notes !== null}>
          <summary>Cómo lo interpretó la IA</summary>
          {job.claude_notes && <p>{job.claude_notes}</p>}
          {job.render_prompt && <code>{job.render_prompt}</code>}
        </details>
      )}
    </div>
  );
}
