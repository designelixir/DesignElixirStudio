"use client";

import { useState } from "react";

type MixpanelEvent = Record<string, string>;

interface ApiResponse {
  count: number;
  events: MixpanelEvent[];
  error?: string;
}

// Column order for table and CSV
const COLUMNS = [
  "Time",
  "Distinct ID",
  "Browser",
  "City",
  "Current URL",
  "Device ID",
  "Initial Referrer",
  "Initial Referring Domain",
  "Referrer",
  "Referring Domain",
  "Region",
  "Search Engine",
  "Current Domain",
  "Page Title",
  "URL Path",
  "URL Protocol",
  "Country",
  "UTM Source",
  "URL Search",
];

function exportToCSV(events: MixpanelEvent[], from: string, to: string) {
  const header = COLUMNS.join(",");
  const rows = events.map((ev) =>
    COLUMNS.map((col) => {
      const val = ev[col] ?? "—";
      // Wrap in quotes if value contains comma, quote, or newline
      return /[,"\n]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(",")
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "mixpanel-events-" + from + "-to-" + to + ".csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function MixpanelExplorer() {
  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [from, setFrom] = useState(sevenDaysAgo);
  const [to, setTo] = useState(today);
  const [eventName, setEventName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchEvents() {
    setLoading(true);
    setError(null);
    setResult(null);

    const params = new URLSearchParams({ from, to });
    if (eventName.trim()) params.set("event", eventName.trim());

    try {
      const res = await fetch(`/api/mixpanel?${params.toString()}`);
      const data: ApiResponse = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Unknown error");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>Mixpanel Event Explorer</h1>

      <div className="mixpanel-controls">
        <label>
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>

        <label>
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>

        <label>
          Event name (optional)
          <input
            type="text"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="e.g. page_view"
          />
        </label>

        <button onClick={fetchEvents} disabled={loading}>
          {loading ? "Loading..." : "Fetch Events"}
        </button>
      </div>

      {error && (
        <p className="mixpanel-error">{error}</p>
      )}

      {result && (
        <div className="mixpanel-results">
          <div className="mixpanel-results-header">
            <p>
              {result.count} events returned for {from} &rarr; {to}
              {eventName ? ` · filtered to "${eventName}"` : ""}
            </p>
            <button
              className="mixpanel-export-btn"
              onClick={() => exportToCSV(result.events, from, to)}
            >
              Export CSV
            </button>
          </div>

          <div className="mixpanel-table-wrapper">
            <table className="mixpanel-table">
              <thead>
                <tr>
                  {COLUMNS.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.events.map((ev, i) => (
                  <tr key={i}>
                    {COLUMNS.map((col) => (
                      <td key={col}>{ev[col] ?? "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}