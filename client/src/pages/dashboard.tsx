import { useState, useEffect } from "react";
import { Phone, MapPin, XCircle, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";

const SESSION_KEY = "dashboard_auth";
const TOKEN_KEY = "dashboard_admin_token";

type Booking = {
  id: number;
  name: string;
  phone: string;
  streetAddress: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  zipCode: string;
  serviceType: string;
  preferredDate: string;
  appointmentTime: string;
  pricingTotal?: string | null;
  status?: string | null;
};

export default function Dashboard() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === "true");
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || "");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState<number | null>(null);

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    fetch("/api/admin/bookings", {
      headers: { "x-admin-token": adminToken },
    })
      .then(r => {
        if (!r.ok) throw new Error("Admin authorization failed");
        return r.json();
      })
      .then(data => setBookings(Array.isArray(data) ? data : []))
      .catch(() => {
        setBookings([]);
        setPinError(true);
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
        setAuthed(false);
      })
      .finally(() => setLoading(false));
  }, [adminToken, authed]);

  function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = pin.trim();
    if (!token) return;
    sessionStorage.setItem(SESSION_KEY, "true");
    sessionStorage.setItem(TOKEN_KEY, token);
    setAdminToken(token);
    setAuthed(true);
  }

  async function cancelBooking(id: number) {
    if (!confirm("Cancel this booking?")) return;
    setCancelling(id);
    try {
      const response = await fetch(`/api/admin/bookings/${id}/cancel`, {
        method: "POST",
        headers: { "x-admin-token": adminToken },
      });
      if (!response.ok) throw new Error("Admin authorization failed");
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "cancelled" } : b));
    } finally {
      setCancelling(null);
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <form onSubmit={handlePinSubmit} className="bg-white rounded-2xl p-8 w-full max-w-xs shadow-2xl space-y-4 text-center">
          <div className="text-4xl mb-2">🔐</div>
          <h1 className="text-xl font-bold text-slate-900">Owner Dashboard</h1>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={e => { setPin(e.target.value); setPinError(false); }}
            placeholder="Enter PIN"
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          {pinError && <p className="text-red-500 text-sm">Incorrect PIN</p>}
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white">
            Unlock
          </Button>
        </form>
      </div>
    );
  }

  const active = bookings.filter(b => b.status !== "cancelled");
  const cancelled = bookings.filter(b => b.status === "cancelled");

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-slate-900 text-white px-4 py-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Owner Dashboard</h1>
            <p className="text-slate-400 text-sm">
              {active.length} active booking{active.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => { sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(TOKEN_KEY); setAuthed(false); }}
            className="text-slate-400 text-sm hover:text-white transition-colors"
          >
            Lock
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
        {loading && (
          <p className="text-center text-slate-500 py-12">Loading bookings…</p>
        )}

        {!loading && active.length === 0 && (
          <p className="text-center text-slate-500 py-12">No active bookings.</p>
        )}

        {active.map(b => (
          <BookingCard key={b.id} booking={b} cancelling={cancelling} onCancel={cancelBooking} />
        ))}

        {cancelled.length > 0 && (
          <details className="mt-8">
            <summary className="text-sm text-slate-400 cursor-pointer select-none mb-3 list-none">
              {cancelled.length} cancelled booking{cancelled.length !== 1 ? "s" : ""} ▾
            </summary>
            <div className="space-y-4 mt-3">
              {cancelled.map(b => (
                <BookingCard key={b.id} booking={b} cancelling={cancelling} onCancel={cancelBooking} />
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function BookingCard({
  booking: b,
  cancelling,
  onCancel,
}: {
  booking: Booking;
  cancelling: number | null;
  onCancel: (id: number) => void;
}) {
  const address = [b.streetAddress, b.addressLine2, b.city, b.state, b.zipCode]
    .filter(Boolean)
    .join(", ");
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  const isCancelled = b.status === "cancelled";

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4${isCancelled ? " opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-slate-900 text-lg leading-tight">{b.name}</p>
          <a href={`tel:${b.phone}`} className="text-blue-600 text-sm font-medium flex items-center gap-1 mt-0.5">
            <Phone className="h-3.5 w-3.5" /> {b.phone}
          </a>
        </div>
        {isCancelled ? (
          <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-1 rounded-full shrink-0">Cancelled</span>
        ) : (
          <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full shrink-0">Active</span>
        )}
      </div>

      <div className="space-y-1.5 text-sm text-slate-600">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
          <span>{address}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 shrink-0">📅</span>
          <span>{b.preferredDate} at {b.appointmentTime}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-slate-400 shrink-0">🔧</span>
          <span>{b.serviceType}</span>
        </div>
        {b.pricingTotal && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400 shrink-0">💰</span>
            <span className="font-semibold text-slate-800">{b.pricingTotal}</span>
          </div>
        )}
      </div>

      {!isCancelled && (
        <div className="flex gap-2 pt-1">
          <a href={`tel:${b.phone}`} className="flex-1">
            <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-500 text-white gap-1">
              <Phone className="h-4 w-4" /> Call
            </Button>
          </a>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button size="sm" variant="outline" className="w-full gap-1 border-slate-300">
              <Navigation className="h-4 w-4" /> Directions
            </Button>
          </a>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1 border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => onCancel(b.id)}
            disabled={cancelling === b.id}
          >
            <XCircle className="h-4 w-4" />
            {cancelling === b.id ? "…" : "Cancel"}
          </Button>
        </div>
      )}
    </div>
  );
}
