// A failed availability request must never become an empty list of taken slots.
export async function fetchTakenSlots(
  date: string,
  signal?: AbortSignal,
  request: typeof fetch = fetch,
): Promise<string[]> {
  const response = await request(`/api/availability?date=${encodeURIComponent(date)}`, {
    signal,
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Availability is temporarily unavailable.");
  const data: unknown = await response.json();
  if (!Array.isArray(data) || !data.every((slot) => typeof slot === "string")) {
    throw new Error("Invalid availability response.");
  }
  return data;
}
