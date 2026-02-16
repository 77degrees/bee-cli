import type { CommandContext } from "@/commands/types";
import { requireClientToken } from "@/client/clientApi";
import { getDashboardHtml } from "./dashboard";
import { tryOpenDatabase } from "@/db/database";
import {
  listConfig,
  setConfigValue,
  deleteConfigValue,
} from "@/db/configRepo";
import {
  listProfiles,
  createProfile,
  deleteProfile,
  getProfileByName,
} from "@/db/speakerRepo";
import { getIntegrationsByType } from "@/integrations/db";
import { createCalendarProviderFromConfig } from "@/integrations/providers/registry";
import { createMailProviderFromConfig } from "@/integrations/providers/registry";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function startServer(
  context: CommandContext,
  port: number
): Promise<void> {
  const token = await requireClientToken(context);

  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);

      if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: CORS });
      }

      try {
        if (url.pathname === "/" || url.pathname === "/index.html") {
          return new Response(getDashboardHtml(), {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }

        if (url.pathname.startsWith("/api/bee/")) {
          return await proxyBeeApi(context, token, url, req);
        }

        if (url.pathname.startsWith("/api/local/")) {
          return await handleLocal(url, req);
        }

        return new Response("Not Found", { status: 404 });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Internal error";
        return Response.json(
          { error: msg },
          { status: 500, headers: CORS }
        );
      }
    },
  });

  console.log("");
  console.log(`  Bee Dashboard: http://localhost:${server.port}`);
  console.log("");
  console.log("  Press Ctrl+C to stop.");
  console.log("");

  await new Promise(() => {});
}

async function proxyBeeApi(
  context: CommandContext,
  token: string,
  url: URL,
  req: Request
): Promise<Response> {
  const apiPath = url.pathname.slice("/api/bee".length) + url.search;
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);
  if (req.method !== "GET" && req.method !== "HEAD") {
    headers.set("Content-Type", "application/json");
  }

  const response = await context.client.fetch(apiPath, {
    method: req.method,
    headers,
    body: req.method !== "GET" && req.method !== "HEAD"
      ? await req.text()
      : undefined,
  });

  const data = await response.text();
  return new Response(data, {
    status: response.status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function handleLocal(url: URL, req: Request): Promise<Response> {
  const path = url.pathname.slice("/api/local".length);
  const json = (data: unknown, status = 200) =>
    Response.json(data, { status, headers: CORS });

  // --- Config ---
  if (path === "/config" && req.method === "GET") {
    const db = tryOpenDatabase();
    if (!db) return json([]);
    return json(listConfig(db));
  }
  if (path === "/config" && req.method === "POST") {
    const db = tryOpenDatabase();
    if (!db) return json({ error: "Database unavailable" }, 500);
    const body = (await req.json()) as { key: string; value: string };
    setConfigValue(db, body.key, body.value);
    return json({ ok: true });
  }
  if (path.startsWith("/config/") && req.method === "DELETE") {
    const key = decodeURIComponent(path.slice("/config/".length));
    const db = tryOpenDatabase();
    if (!db) return json({ error: "Database unavailable" }, 500);
    deleteConfigValue(db, key);
    return json({ ok: true });
  }

  // --- Speakers ---
  if (path === "/speakers" && req.method === "GET") {
    const db = tryOpenDatabase();
    if (!db) return json([]);
    return json(listProfiles(db));
  }
  if (path === "/speakers" && req.method === "POST") {
    const db = tryOpenDatabase();
    if (!db) return json({ error: "Database unavailable" }, 500);
    const body = (await req.json()) as { name: string; notes?: string };
    const profile = createProfile(db, body.name, body.notes);
    return json(profile);
  }
  if (path.startsWith("/speakers/") && req.method === "DELETE") {
    const name = decodeURIComponent(path.slice("/speakers/".length));
    const db = tryOpenDatabase();
    if (!db) return json({ error: "Database unavailable" }, 500);
    const profile = getProfileByName(db, name);
    if (!profile) return json({ error: "Not found" }, 404);
    deleteProfile(db, profile.id);
    return json({ ok: true });
  }

  // --- Calendar ---
  if (path === "/calendar/events" && req.method === "GET") {
    return await handleCalendarEvents(url);
  }

  // --- Mail ---
  if (path === "/mail/recent" && req.method === "GET") {
    return await handleMailRecent(url);
  }

  return json({ error: "Not found" }, 404);
}

async function handleCalendarEvents(url: URL): Promise<Response> {
  const db = tryOpenDatabase();
  if (!db) return Response.json([], { headers: CORS });

  const integrations = getIntegrationsByType(db, "calendar");
  if (integrations.length === 0) return Response.json([], { headers: CORS });

  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  const now = new Date();
  const from = fromStr ? new Date(fromStr) : startOfDay(now);
  const to = toStr ? new Date(toStr) : endOfDay(addDays(now, 7));

  const events: unknown[] = [];
  for (const config of integrations) {
    try {
      const provider = await createCalendarProviderFromConfig(config);
      const evts = await provider.listEvents(from, to);
      events.push(...evts.map((e) => ({ ...e, provider_name: config.name })));
    } catch {
      // skip failed providers
    }
  }

  events.sort((a: any, b: any) => (a.start ?? "").localeCompare(b.start ?? ""));
  return Response.json(events, { headers: CORS });
}

async function handleMailRecent(url: URL): Promise<Response> {
  const db = tryOpenDatabase();
  if (!db) return Response.json([], { headers: CORS });

  const integrations = getIntegrationsByType(db, "mail");
  if (integrations.length === 0) return Response.json([], { headers: CORS });

  const limit = Number(url.searchParams.get("limit") ?? "20");
  const messages: unknown[] = [];

  for (const config of integrations) {
    try {
      const provider = createMailProviderFromConfig(config);
      const msgs = await provider.recent(limit);
      messages.push(
        ...msgs.map((m) => ({ ...m, provider_name: config.name }))
      );
      await provider.disconnect();
    } catch {
      // skip failed providers
    }
  }

  messages.sort((a: any, b: any) =>
    (b.date ?? "").localeCompare(a.date ?? "")
  );
  return Response.json(messages.slice(0, limit), { headers: CORS });
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
