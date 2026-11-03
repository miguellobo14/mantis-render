import type { RenderJob } from "@/lib/api";

// "processing" covers two steps; whether Claude's prompt is saved tells us which one is running.
function stageLabel(job: RenderJob): string {
  switch (job.status) {
    case "queued":
      return job.attempts > 0 ? "Reintentando" : "En cola";
    case "processing":
      return job.render_prompt ? "fal.ai generando el render" : "Claude interpretando el brief";
    case "done":
      return "Listo";
    case "failed":
      return "Falló";
  }
}

export default function RenderCard({ job }: { job: RenderJob }) {
  const busy = job.status === "queued" || job.status === "processing";

  return (
    <article className="panel card">
      <header className="card-header">
        <p className="card-brief">“{job.brief}”</p>
        <span className={`status status-${job.status}`}>
          {busy && <span className="pulse" />}
          {stageLabel(job)}
        </span>
      </header>

      <div className="compare">
        <figure>
          <img src={job.input_url} alt="Imagen de referencia" />
          <figcaption>Referencia</figcaption>
        </figure>
        <figure>
          {job.result_url ? (
            <a href={job.result_url} target="_blank" rel="noreferrer">
              <img src={job.result_url} alt={`Render: ${job.brief}`} />
            </a>
          ) : (
            <div className={`placeholder ${busy ? "is-busy" : ""}`}>
              {busy ? "Generando…" : "Sin resultado"}
            </div>
          )}
          <figcaption>Render</figcaption>
        </figure>
      </div>

      {job.claude_notes && (
        <p className="claude-notes">
          <span className="tag">Claude</span> {job.claude_notes}
        </p>
      )}
      {job.render_prompt && (
        <details className="prompt">
          <summary>Prompt que Claude escribió para fal.ai</summary>
          <p>{job.render_prompt}</p>
        </details>
      )}
      {job.error && <p className={job.status === "failed" ? "card-error" : "card-warning"}>{job.error}</p>}

      <footer className="card-meta">
        {new Date(job.created_at).toLocaleString("es")} · intento {Math.max(job.attempts, 1)} · {job.id.slice(0, 8)}
      </footer>
    </article>
  );
}
