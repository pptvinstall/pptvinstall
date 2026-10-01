import { Card } from "@/components/ui/card";

import type { PendingQuote } from "@/pages/booking/shared";

type Props = {
  pendingQuote: PendingQuote | null;
  quoteExpanded: boolean;
  onToggleExpanded: () => void;
};

export default function QuoteSummaryCard({ pendingQuote, quoteExpanded, onToggleExpanded }: Props) {
  if (!pendingQuote) return null;

  return (
    <Card className="mb-6 overflow-hidden border-blue-200 bg-blue-50">
      <div className="border-b border-blue-100 px-6 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Your Quote Summary</p>
            <p className="mt-1 text-sm text-slate-700">{pendingQuote.summary}</p>
          </div>
          <div className="text-2xl font-extrabold text-blue-700">${pendingQuote.total}</div>
        </div>
      </div>
      <div className="px-6 py-4">
        <button type="button" onClick={onToggleExpanded} className="text-sm font-semibold text-blue-700 hover:text-blue-900">
          {quoteExpanded ? "Hide quote details" : "View quote details"}
        </button>
        {quoteExpanded ? (
          <div className="mt-4 space-y-4">
            {pendingQuote.groups.map((group) => (
              <div key={group.title} className="space-y-2">
                <p className="font-semibold text-slate-900">{group.title}</p>
                {group.items.map((item) => (
                  <div key={`${group.title}-${item.name}`} className="flex items-start justify-between gap-3 text-sm text-slate-600">
                    <span>{item.qty && item.qty > 1 ? `${item.qty}x ${item.name}` : item.name}</span>
                    <span className="font-semibold text-slate-900">${Math.abs(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : null}
        <p className="mt-4 text-xs text-slate-500">This is your estimated price. Final total is confirmed before work begins.</p>
      </div>
    </Card>
  );
}
