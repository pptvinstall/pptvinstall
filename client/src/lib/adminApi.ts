// Owner API client for Job OS. The admin token lives in sessionStorage (same key as the
// existing admin page) and is sent as x-admin-token. It is never logged or put in a URL.

const TOKEN_KEY = "admin_api_token";

export class AdminApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly issues?: Array<{ path: string; message: string }>) {
    super(message);
    this.name = "AdminApiError";
  }
}

export function getAdminToken(): string {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setAdminToken(token: string) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable: the token stays in memory for this page only */
  }
}

export function clearAdminToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export async function adminFetch<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getAdminToken();
  let res: Response;
  try {
    res = await fetch(`/api/admin/job-os${path}`, {
      method: init.method ?? "GET",
      headers: { "x-admin-token": token, ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new AdminApiError("Can't reach the server. Check your connection and try again.", 0);
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* empty or non-JSON body */
  }
  if (!res.ok) {
    if (res.status === 401) throw new AdminApiError("That access code was not accepted.", 401);
    if (res.status === 404 && data === null) throw new AdminApiError("Job OS is not enabled on this server.", 404);
    throw new AdminApiError(data?.message ?? `Request failed (${res.status})`, res.status, data?.issues);
  }
  return data as T;
}

export function money(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return "—";
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toLocaleString("en-US", { minimumFractionDigits: abs % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}

export function describeError(err: unknown): string {
  if (err instanceof AdminApiError) {
    const detail = err.issues?.length ? ` (${err.issues.slice(0, 2).map((i) => `${i.path}: ${i.message}`).join("; ")})` : "";
    return err.message + detail;
  }
  return err instanceof Error ? err.message : "Something went wrong.";
}

/** Upload raw bytes (an image) with progress. Uses XHR because fetch has no upload progress. */
export function adminUpload<T>(path: string, file: Blob, onProgress?: (fraction: number) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/admin/job-os${path}`);
    xhr.setRequestHeader("x-admin-token", getAdminToken());
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onerror = () => reject(new AdminApiError("Upload failed. Check your connection and try again.", 0));
    xhr.onload = () => {
      let data: any = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as T);
      else if (xhr.status === 401) reject(new AdminApiError("That access code was not accepted.", 401));
      else reject(new AdminApiError(data?.message ?? `Upload failed (${xhr.status})`, xhr.status));
    };
    xhr.send(file);
  });
}

async function adminFile(path: string): Promise<{ blob: Blob; filename: string | null }> {
  let res: Response;
  try {
    res = await fetch(`/api/admin/job-os${path}`, { headers: { "x-admin-token": getAdminToken() } });
  } catch {
    throw new AdminApiError("Can't reach the server. Check your connection and try again.", 0);
  }
  if (!res.ok) {
    let message = res.status === 401 ? "That access code was not accepted." : `Could not load the file (${res.status})`;
    try {
      const data = await res.json();
      if (data?.message && res.status !== 401) message = data.message;
    } catch {
      /* not JSON */
    }
    throw new AdminApiError(message, res.status);
  }
  const filename = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? null;
  return { blob: await res.blob(), filename };
}

/** Fetch a private file (image or PDF) with the admin token and return a short-lived object URL. */
export async function adminObjectUrl(path: string): Promise<string> {
  return URL.createObjectURL((await adminFile(path)).blob);
}

/** Download a private PDF (estimate, invoice, receipt). The token travels in a header, never in the URL. */
export async function adminDownload(path: string, fallbackName: string): Promise<void> {
  const { blob, filename } = await adminFile(path);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? fallbackName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
