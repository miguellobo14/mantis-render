"use client";

import { useCallback, useEffect, useState } from "react";
import logo from "@/assets/mantis-logo.png";
import RenderCard from "@/components/RenderCard";
import RenderForm from "@/components/RenderForm";
import { API_URL, listRenders, type RenderJob } from "@/lib/api";

const PIPELINE = [
  ["Next.js", "subes la imagen"],
  ["FastAPI", "valida y guarda"],
  ["ARQ", "cola y reintentos"],
  ["Claude", "escribe el prompt"],
  ["fal.ai", "genera el render"],
];

export default function Home() {
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setJobs(await listRenders());
      setLoadError(null);
    } catch {
      setLoadError(`No se pudo conectar con la API en ${API_URL}.`);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll only while something is still in flight.
  const inFlight = jobs.some((job) => job.status === "queued" || job.status === "processing");
  useEffect(() => {
    if (!inFlight) return;
    const timer = setInterval(refresh, 2000);
    return () => clearInterval(timer);
  }, [inFlight, refresh]);

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <img src={logo.src} width={logo.width} height={logo.height} alt="" />
          <div>
            <strong>Mantis</strong>
            <span>Render</span>
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <h1>Renders fotorrealistas desde tu modelo</h1>
          <p>Sube una vista de tu modelo, describe el ambiente y recibe un render fotorrealista.</p>
          <ol className="pipeline">
            {PIPELINE.map(([name, role]) => (
              <li key={name}>
                <strong>{name}</strong>
                <span>{role}</span>
              </li>
            ))}
          </ol>
        </section>

        <RenderForm onCreated={(job) => setJobs((prev) => [job, ...prev])} />

        {loadError && <p className="form-error">{loadError}</p>}

        <section className="jobs">
          {jobs.length === 0 && !loadError && <p className="empty">Aún no hay renders.</p>}
          {jobs.map((job) => (
            <RenderCard key={job.id} job={job} />
          ))}
        </section>
      </main>
    </>
  );
}
