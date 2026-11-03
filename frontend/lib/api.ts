export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type RenderStatus = "queued" | "processing" | "done" | "failed";

export interface RenderJob {
  id: string;
  status: RenderStatus;
  brief: string;
  render_prompt: string | null;
  claude_notes: string | null;
  error: string | null;
  attempts: number;
  input_url: string;
  result_url: string | null;
  created_at: string;
  updated_at: string;
}

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

export async function createRender(image: File, brief: string): Promise<RenderJob> {
  const body = new FormData();
  body.append("image", image);
  body.append("brief", brief);
  return parse(await fetch(`${API_URL}/renders`, { method: "POST", body }));
}
