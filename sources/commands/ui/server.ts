import type { CommandContext } from "@/commands/types";
import { loadToken, saveToken } from "@/secureStore";
import { fetchClientMe } from "@/client/clientMe";
import { requestAppPairing } from "@/commands/auth/appPairingRequest";
import {
  generateAppPairingKeyPair,
  decryptAppPairingToken,
} from "@/utils/appPairingCrypto";
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

function getDefaultAppId(env: string): string {
  if (env === "staging") return "pk5z3uuzjpxj4f7frk6rsq2f";
  return "ph9fssu1kv1b0hns69fxf7rx";
}

type ActivePairing = {
  appId: string;
  publicKey: string;
  secretKey: Uint8Array;
  requestId: string;
  pairingUrl: string;
  expiresAt: string;
};

export async function startServer(
  context: CommandContext,
  port: number
): Promise<void> {
  let currentToken: string | null = null;
  try {
    currentToken = await loadToken(context.env);
  } catch {
    // Not logged in — dashboard will show login screen
  }

  let activePairing: ActivePairing | null = null;

  const json = (data: unknown, status = 200) =>
    Response.json(data, { status, headers: CORS });

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

        // --- Auth endpoints (always available) ---
        if (url.pathname.startsWith("/api/auth/")) {
          return await handleAuth(url, req);
        }

        // --- Bee API proxy (requires auth) ---
        if (url.pathname.startsWith("/api/bee/")) {
          if (!currentToken) {
            return json({ error: "Not logged in" }, 401);
          }
          return await proxyBeeApi(context, currentToken, url, req);
        }

        // --- Local DB endpoints ---
        if (url.pathname.startsWith("/api/local/")) {
          return await handleLocal(url, req);
        }

        return new Response("Not Found", { status: 404 });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Internal error";
        return json({ error: msg }, 500);
      }
    },
  });

  const loggedInText = currentToken ? "(logged in)" : "(not logged in — use dashboard to connect)";
  console.log("");
  console.log(`  Bee Dashboard: http://localhost:${server.port}  ${loggedInText}`);
  console.log("");
  console.log("  Press Ctrl+C to stop.");
  console.log("");

  async function handleAuth(url: URL, req: Request): Promise<Response> {
    const path = url.pathname.slice("/api/auth".length);

    // Check current auth status
    if (path === "/status" && req.method === "GET") {
      if (!currentToken) return json({ authenticated: false });
      try {
        const user = await fetchClientMe(context, currentToken);
        return json({ authenticated: true, user });
      } catch {
        currentToken = null;
        return json({ authenticated: false });
      }
    }

    // Start app pairing flow
    if (path === "/start" && req.method === "POST") {
      const keyPair = generateAppPairingKeyPair();
      const appId = getDefaultAppId(context.env);

      const result = await requestAppPairing(
        context.env,
        appId,
        keyPair.publicKeyBase64
      );

      if (result.status === "completed") {
        const token = decryptAppPairingToken(
          result.encryptedToken,
          keyPair.secretKey
        );
        await saveToken(context.env, token);
        currentToken = token;
        return json({ status: "completed" });
      }

      if (result.status === "expired") {
        return json({ status: "expired" });
      }

      const pairingUrl = `https://bee.computer/connect#${result.requestId}`;
      activePairing = {
        appId,
        publicKey: keyPair.publicKeyBase64,
        secretKey: keyPair.secretKey,
        requestId: result.requestId,
        pairingUrl,
        expiresAt: result.expiresAt,
      };

      return json({
        status: "pending",
        pairingUrl,
        expiresAt: result.expiresAt,
      });
    }

    // Poll for pairing completion
    if (path === "/poll" && req.method === "GET") {
      if (!activePairing) {
        return json({ error: "No active pairing session" }, 400);
      }

      const expiresAtMs = Date.parse(activePairing.expiresAt);
      if (!Number.isNaN(expiresAtMs) && Date.now() >= expiresAtMs) {
        activePairing = null;
        return json({ status: "expired" });
      }

      const result = await requestAppPairing(
        context.env,
        activePairing.appId,
        activePairing.publicKey
      );

      if (result.status === "completed") {
        const token = decryptAppPairingToken(
          result.encryptedToken,
          activePairing.secretKey
        );
        await saveToken(context.env, token);
        currentToken = token;
        activePairing = null;
        return json({ status: "completed" });
      }

      if (result.status === "expired") {
        activePairing = null;
        return json({ status: "expired" });
      }

      return json({ status: "pending" });
    }

    // Direct token login
    if (path === "/token" && req.method === "POST") {
      const body = (await req.json()) as { token?: string };
      const rawToken = body.token?.trim();
      if (!rawToken) return json({ error: "Token required" }, 400);
      try {
        const user = await fetchClientMe(context, rawToken);
        await saveToken(context.env, rawToken);
        currentToken = rawToken;
        return json({ status: "completed", user });
      } catch {
        return json({ error: "Invalid token" }, 401);
      }
    }

    return json({ error: "Not found" }, 404);
  }

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
