export type ListParams = { sortBy?: "time"|"score"; channel?: string };

async function handle(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data?.error || res.statusText), { status: res.status, data });
  return data;
}

export async function apiLogin(username: string, password: string) {
  const res = await fetch("/api/login", { method: "POST", body: JSON.stringify({ username, password }) });
  return handle(res);
}

export async function apiLogout() {
  const res = await fetch("/api/logout", { method: "POST" });
  return handle(res);
}

export async function apiIngest() {
  const res = await fetch("/api/ingest", { method: "POST" });
  return handle(res);
}

export async function apiEvaluate(imageId: string) {
  const res = await fetch("/api/evaluate", { method: "POST", body: JSON.stringify({ imageId }) });
  return handle(res);
}

export async function apiListImages(params: ListParams = {}) {
  const q = new URLSearchParams({ ...(params.sortBy?{sortBy:params.sortBy}:{}), ...(params.channel?{channel:params.channel}:{}) });
  const res = await fetch(`/api/images?${q.toString()}`);
  return handle(res);
}

export async function apiClearEvaluations() {
  const res = await fetch("/api/evaluations/clear", { method: "POST" });
  return handle(res);
}
