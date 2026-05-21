import { NextRequest, NextResponse } from "next/server";

// Fields to keep from event properties, mapped to clean column names
const FIELD_MAP: Record<string, string> = {
  distinct_id: "Distinct ID",
  $browser: "Browser",
  $city: "City",
  $current_url: "Current URL",
  $device_id: "Device ID",
  $initial_referrer: "Initial Referrer",
  $initial_referring_domain: "Initial Referring Domain",
  $referrer: "Referrer",
  $referring_domain: "Referring Domain",
  $region: "Region",
  $search_engine: "Search Engine",
  mp_current_domain: "Current Domain",
  $page_title: "Page Title",
  $url_path: "URL Path",
  $url_protocol: "URL Protocol",
  mp_country_code: "Country",
  utm_source: "UTM Source",
  $url_search: "URL Search",
};

function formatUnixTimestamp(unix: number): string {
  const date = new Date(unix * 1000);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const event = searchParams.get("event");

  if (!from || !to) {
    return NextResponse.json(
      { error: "Missing required params: from, to (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const serviceAccountUsername = process.env.MIXPANEL_SERVICE_ACCOUNT_USERNAME;
  const serviceAccountPassword = process.env.MIXPANEL_SERVICE_ACCOUNT_PASSWORD;
  const projectId = process.env.MIXPANEL_PROJECT_ID;

  if (!serviceAccountUsername || !serviceAccountPassword || !projectId) {
    return NextResponse.json(
      { error: "Missing Mixpanel env vars" },
      { status: 500 }
    );
  }

  const credentials = Buffer.from(
    `${serviceAccountUsername}:${serviceAccountPassword}`
  ).toString("base64");

  const params = new URLSearchParams({
    project_id: projectId,
    from_date: from,
    to_date: to,
    ...(event ? { event: JSON.stringify([event]) } : {}),
  });

  const mixpanelUrl = `https://data.mixpanel.com/api/2.0/export?${params.toString()}`;

  try {
    const res = await fetch(mixpanelUrl, {
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: "text/plain",
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `Mixpanel error: ${errorText}` },
        { status: res.status }
      );
    }

    const raw = await res.text();
    const lines = raw.split("\n").filter((line) => line.trim() !== "");

    const events = lines.map((line) => {
      try {
        const parsed = JSON.parse(line);
        const props = parsed.properties || {};

        // Build filtered + renamed event object
        const filtered: Record<string, string> = {
          Time: props.time ? formatUnixTimestamp(props.time) : "—",
        };

        for (const [rawKey, label] of Object.entries(FIELD_MAP)) {
          const val = props[rawKey];
          filtered[label] = val !== undefined && val !== null ? String(val) : "—";
        }

        return filtered;
      } catch {
        return { raw: line };
      }
    });

    return NextResponse.json({ count: events.length, events });
  } catch (err) {
    return NextResponse.json(
      { error: `Fetch failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}