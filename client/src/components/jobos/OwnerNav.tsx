import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin/job-builder", label: "Builder" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/pricing-config", label: "Economics" },
];

export default function OwnerNav() {
  const [location] = useLocation();
  return (
    <nav aria-label="Owner tools" className="sticky top-0 z-30 flex gap-1 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={cn("flex h-11 flex-1 items-center justify-center rounded-lg text-sm font-semibold", location.startsWith(l.href) ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}
        >
          {l.label}
        </Link>
      ))}
      <Link href="/admin" className="flex h-11 items-center justify-center rounded-lg px-3 text-sm text-slate-500 hover:bg-slate-100">Bookings</Link>
    </nav>
  );
}
