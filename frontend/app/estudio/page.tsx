"use client";

import { DragEvent, useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import ConfigPanel, { type Config } from "@/components/studio/ConfigPanel";
import JobViewer, { type Selection } from "@/components/studio/JobViewer";
import RendersGrid from "@/components/studio/RendersGrid";
import TemplateGallery from "@/components/studio/TemplateGallery";
import ToolRail, { type StudioView } from "@/components/studio/ToolRail";
import { API_URL, createRender, editRender, isBusy, listRenders, type RenderJob, upscaleRender } from "@/lib/api";
import { STYLES, styleLabel, TOOLS, toolById } from "@/lib/catalog";
import { fileFromUrl, prepareImage } from "@/lib/images";
import "./studio.css";

const EMPTY_CONFIG: Config = { style: null, brief: "", variants: 1, reference: null };

function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url;
}

export default function Studio() {
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<StudioView>("crear");
  const [toolId, setToolId] = useState(TOOLS[0].id);
  const [config, setConfig] = useState<Config>(EMPTY_CONFIG);
  const [draft, setDraft] = useState<File | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const draftUrl = useObjectUrl(draft);
  const referenceUrl = useObjectUrl(config.reference);
  const tool = toolById(toolId);

  const refresh = useCallback(async () => {
    try {
      setJobs(await listRenders());
      setLoadError(null);
    } catch {
      setLoadError(`No pudimos conectarnos con el servidor (${API_URL}). Revisa que esté encendido.`);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Links from the landing open the studio on a given tool or style.
    const params = new URLSearchParams(window.location.search);
    const linkedTool = params.get("tool");
    const linkedStyle = params.get("style");
    if (linkedTool && TOOLS.some((item) => item.id === linkedTool)) setToolId(linkedTool);
    if (linkedStyle && STYLES.some((item) => item.id === linkedStyle)) {
      setConfig((current) => ({ ...current, style: linkedStyle }));
    }
  }, [refresh]);

  // Poll only while something is still in flight, edits and upscales included.
  const inFlight = jobs.some((job) => isBusy(job) || job.derived.some(isBusy));
  useEffect(() => {
    if (!inFlight) return;
    const timer = setInterval(refresh, 2000);
    return () => clearInterval(timer);
  }, [inFlight, refresh]);

  const patchConfig = (patch: Partial<Config>) => setConfig((current) => ({ ...current, ...patch }));

  async function pickFile(file: File) {
    setError(null);
    try {
      setDraft(await prepareImage(file));
      setSelection(null);
      setView("crear");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function pickReference(file: File) {
    setError(null);
    try {
      patchConfig({ reference: await prepareImage(file) });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function chooseTool(id: string) {
    setToolId(id);
    // The panel configures a new render, so leave the job being viewed.
    setSelection(null);
    setView("crear");
  }

  function startNew() {
    setSelection(null);
    setDraft(null);
    setError(null);
    setView("crear");
  }

  async function generate() {
    if (!draft) return;
    setSubmitting(true);
    setError(null);
    try {
      const style = tool.usesStyle ? config.style : null;
      // The API needs some text; with a style picked, the description is optional for the user.
      const brief = config.brief.trim() || (style ? `Estilo ${styleLabel(style)}` : tool.title);
      const job = await createRender(draft, brief, {
        mode: tool.id,
        style,
        variants: config.variants,
        reference: tool.usesStyle ? config.reference : null,
      });
      setJobs((current) => [job, ...current]);
      setSelection({ rootId: job.id, jobId: job.id, index: 0 });
      setDraft(null);
      patchConfig({ brief: "", reference: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  function afterDerived(created?: RenderJob) {
    if (created) {
      setSelection({ rootId: created.root_id ?? created.id, jobId: created.id, index: 0 });
    }
    return refresh();
  }

  async function retry(job: RenderJob) {
    setError(null);
    try {
      if (job.kind === "render") {
        const image = await fileFromUrl(job.input_url, "imagen.jpg");
        const reference = job.reference_url ? await fileFromUrl(job.reference_url, "referencia.jpg") : null;
        const again = await createRender(image, job.brief, { mode: job.mode, style: job.style, variants: job.variants, reference });
        setJobs((current) => [again, ...current]);
        setSelection({ rootId: again.id, jobId: again.id, index: 0 });
      } else if (job.parent_id && job.kind === "upscale") {
        await afterDerived(await upscaleRender(job.parent_id, job.source_index));
      } else if (job.parent_id && job.masked) {
        // The painted area isn't kept in the browser: back to the source image to paint it again.
        setSelection({ rootId: job.root_id ?? job.parent_id, jobId: job.parent_id, index: job.source_index });
      } else if (job.parent_id) {
        await afterDerived(await editRender(job.parent_id, job.source_index, job.brief, null));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) pickFile(file);
  }

  const activeRoot = selection ? jobs.find((job) => job.id === selection.rootId) : undefined;

  return (
    <div className="studio">
      <ToolRail view={view} tool={toolId} rendersCount={jobs.length} onTool={chooseTool} onView={setView} />

      {view === "crear" && (
        <ConfigPanel
          tool={tool}
          config={config}
          onChange={patchConfig}
          draft={draft}
          draftUrl={draftUrl}
          referenceUrl={referenceUrl}
          onPickFile={pickFile}
          onPickReference={pickReference}
          onClearDraft={() => setDraft(null)}
          submitting={submitting}
          error={error}
          onSubmit={generate}
        />
      )}

      <main
        className={`canvas ${view === "renders" ? "is-wide" : ""} ${dragging ? "is-dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setDragging(false);
        }}
        onDrop={onDrop}
      >
        {loadError && <p className="form-error canvas-error">{loadError}</p>}

        {view === "renders" && (
          <RendersGrid
            jobs={jobs}
            onNew={startNew}
            onOpen={(job) => {
              setSelection({ rootId: job.id, jobId: job.id, index: 0 });
              setToolId(job.mode);
              setDraft(null);
              setView("crear");
            }}
          />
        )}

        {view === "crear" && activeRoot && selection && (
          <JobViewer
            key={activeRoot.id}
            root={activeRoot}
            selection={selection}
            onSelect={setSelection}
            onNew={startNew}
            onChanged={afterDerived}
            onRetry={retry}
          />
        )}

        {view === "crear" && !activeRoot && draft && draftUrl && (
          <div className="draft">
            <div className="viewer-stage">
              <img className="viewer-image" src={draftUrl} alt="Imagen elegida" />
            </div>
            <p>
              Imagen lista. Elige un estilo y pulsa <strong>Generar</strong>.
            </p>
          </div>
        )}

        {view === "crear" && !activeRoot && !draft && (
          <div className="start">
            <label className="start-drop">
              <span className="start-icon">
                <Icon name="upload" size={26} />
              </span>
              <strong>Arrastra una imagen o haz clic para subirla</strong>
              <small>Vista de SketchUp, boceto o foto de obra · JPG, PNG o WebP</small>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) pickFile(file);
                  e.target.value = "";
                }}
              />
            </label>
            <TemplateGallery
              key={tool.templates}
              initialGroup={tool.templates}
              onPick={async (template, group) => {
                setError(null);
                try {
                  const file = await fileFromUrl(template.src, `${template.label}.jpg`);
                  setToolId(group.tool);
                  setDraft(file);
                } catch (err) {
                  setError(err instanceof Error ? err.message : String(err));
                }
              }}
            />
          </div>
        )}

        {dragging && (
          <div className="drop-overlay" aria-hidden="true">
            <Icon name="upload" size={30} />
            Suelta la imagen aquí
          </div>
        )}
      </main>
    </div>
  );
}
