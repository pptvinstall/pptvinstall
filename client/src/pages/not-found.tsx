import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 pt-24">
      <div className="max-w-xl rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-3xl font-extrabold text-slate-900">Page not found</h1>
        <p className="mt-3 text-sm text-slate-600">
          That page may have moved, but we can still get you to the right place.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/">
            <Button variant="outline" className="w-full rounded-2xl sm:w-auto">Go Home</Button>
          </Link>
          <Link href="/quote">
            <Button className="w-full rounded-2xl bg-blue-600 text-white hover:bg-blue-500 sm:w-auto">Get a Quote</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
