import Icon from "@/components/Icon";
import { isBusy, type RenderJob } from "@/lib/api";
import { toolById } from "@/lib/catalog";

export default function RendersGrid({
  jobs,
  onOpen,
  onNew,
}: {
  jobs: RenderJob[];
  onOpen: (job: RenderJob) => void;
  onNew: () => void;
}) {
  if (jobs.length === 0) {
    return (
      <div className="renders-empty">
        <Icon name="renders" size={30} />
        <h1>Aún no tienes renders</h1>
        <p>Los renders que generes quedan guardados aquí.</p>
        <button type="button" className="btn-primary" onClick={onNew}>
          Crear mi primer render
        </button>
      </div>
    );
  }

  return (
    <div className="renders">
      <h1>Mis renders</h1>
      <div className="renders-grid">
        {jobs.map((job) => {
          const pending = job.derived.filter(isBusy).length + (isBusy(job) ? 1 : 0);
          return (
            <button key={job.id} type="button" className="render-card" onClick={() => onOpen(job)}>
              <span className="render-thumb">
                <img src={job.result_url ?? job.input_url} alt="" loading="lazy" />
                {pending > 0 && <em className="render-badge is-busy">En proceso</em>}
                {job.status === "failed" && <em className="render-badge is-failed">Falló</em>}
              </span>
              <strong>{job.brief}</strong>
              <small>
                {toolById(job.mode).label}
                {job.result_urls.length > 1 && ` · ${job.result_urls.length} versiones`}
                {job.derived.length > 0 && ` · ${job.derived.length} cambios`}
              </small>
            </button>
          );
        })}
      </div>
    </div>
  );
}
