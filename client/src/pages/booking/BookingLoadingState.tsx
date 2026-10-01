import { Card } from "@/components/ui/card";

export default function BookingLoadingState() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-8 w-48 animate-pulse rounded-full bg-slate-200" />
        <div className="h-4 w-72 animate-pulse rounded-full bg-slate-200" />
      </div>
      <Card className="rounded-[28px] p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
        </div>
        <div className="mt-6 h-32 animate-pulse rounded-2xl bg-slate-100" />
      </Card>
    </div>
  );
}
