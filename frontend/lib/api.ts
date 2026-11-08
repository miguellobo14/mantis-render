export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type RenderStatus = "queued" | "processing" | "done" | "failed";
export type JobKind = "render" | "edit" | "upscale";

export interface RenderJob {
  id: string;
  kind: JobKind;
  status: RenderStatus;
  brief: string;
  mode: string;
  style: string | null;
  variants: number;
  parent_id: string | null;
  root_id: string | null;
  source_index: number;
  masked: boolean;
  render_prompt: string | null;
  claude_notes: string | null;
  error: string | null;
  attempts: number;
  input_url: string;
  reference_url: string | null;
  result_urls: string[];
  result_url: string | null;
  created_at: string;
  updated_at: string;
  derived: RenderJob[];
}

export interface RenderOptions {
  mode: string;
  style: string | null;
  variants: number;
  reference: File | null;
}

export const isBusy = (job: RenderJob) => job.status === "queued" || job.status === "processing";

async function parse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.detail;
    // FastAPI sends a string for HTTPException and a list of issues for validation errors.
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((issue: { msg: string }) => issue.msg).join(", ")
          : `Error ${response.status}`;
    throw new Error(message);
  }
  return response.json();
}

export async function listRenders(): Promise<RenderJob[]> {
  return parse(await fetch(`${API_URL}/renders`, { cache: "no-store" }));
}

export async function createRender(image: File, brief: string, options: RenderOptions): Promise<RenderJob> {
  const body = new FormData();
  body.append("image", image);
  body.append("brief", brief);
  body.append("mode", options.mode);
  body.append("variants", String(options.variants));
  if (options.style) body.append("style", options.style);
  if (options.reference) body.append("reference", options.reference);
  return parse(await fetch(`${API_URL}/renders`, { method: "POST", body }));
}

export async function editRender(
  jobId: string,
  sourceIndex: number,
  instruction: string,
  mask: Blob | null,
): Promise<RenderJob> {
  const body = new FormData();
  body.append("instruction", instruction);
  body.append("source_index", String(sourceIndex));
  if (mask) body.append("mask", mask, "mask.png");
  return parse(await fetch(`${API_URL}/renders/${jobId}/edit`, { method: "POST", body }));
}

export async function upscaleRender(jobId: string, sourceIndex: number): Promise<RenderJob> {
  const body = new FormData();
  body.append("source_index", String(sourceIndex));
  return parse(await fetch(`${API_URL}/renders/${jobId}/upscale`, { method: "POST", body }));
}
