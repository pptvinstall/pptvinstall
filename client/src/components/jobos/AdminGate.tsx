import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import { Loader2, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminFetch, clearAdminToken, describeError, getAdminToken, setAdminToken } from "@/lib/adminApi";

// Verifies the access code against a real admin endpoint before showing owner tools,
// so a wrong code gives immediate feedback instead of a broken page.
export default function AdminGate({ title, children }: { title: string; children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [code, setCode] = useState(getAdminToken());
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  async function unlock() {
    if (!code.trim()) {
      setError("Enter your access code.");
      return;
    }
    setChecking(true);
    setError("");
    setAdminToken(code.trim());
    try {
      await adminFetch("/intake/status");
      setAuthed(true);
    } catch (e) {
      clearAdminToken();
      setError(describeError(e));
    } finally {
      setChecking(false);
    }
  }

  if (authed) return <>{children}</>;

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-4 px-4 py-10">
      <div className="space-y-2 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-blue-600" aria-hidden />
        <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500">Owner access only.</p>
      </div>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void unlock();
        }}
      >
        <label className="sr-only" htmlFor="access-code">Access code</label>
        <Input id="access-code" type="password" autoComplete="current-password" placeholder="Access code" value={code} onChange={(e) => setCode(e.target.value)} className="h-12 text-base" />
        {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" className="h-12 w-full" disabled={checking}>
          {checking ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking…</> : "Unlock"}
        </Button>
      </form>
      <Link href="/admin" className="text-center text-sm text-slate-500 underline">Back to admin</Link>
    </main>
  );
}
