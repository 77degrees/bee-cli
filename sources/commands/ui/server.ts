import type { CommandContext } from "@/commands/types";
import { loadToken, saveToken, clearToken } from "@/secureStore";
import { fetchClientMe } from "@/client/clientMe";
import { requestAppPairing } from "@/commands/auth/appPairingRequest";
import {
  generateAppPairingKeyPair,
  decryptAppPairingToken,
} from "@/utils/appPairingCrypto";
import { getDashboardHtml } from "./dashboard";
import { tryOpenDatabase, getDatabase } from "@/db/database";
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
  assignSpeaker,
  getAssignmentsForProfile,
} from "@/db/speakerRepo";
import { getAllFingerprints, upsertFingerprint } from "@/db/styleRepo";
import { analyzeSpeakerFingerprint, identifySpeakers } from "@/ai/speakerAnalyzer";
import {
  getIntegrationsByType,
  listIntegrations,
  getIntegration,
  createIntegration,
  deleteIntegration,
} from "@/integrations/db";
import {
  createCalendarProviderFromConfig,
  createMailProviderFromConfig,
} from "@/integrations/providers/registry";
import { saveCredential, deleteCredential } from "@/integrations/credentialStore";
import { getProviderDefaults } from "@/integrations/providers/defaults";
import {
  listAllInferences,
  getInferencesForConversation,
  upsertInference,
  clearInferencesForConversation,
} from "@/db/inferenceRepo";
import { resolveAiProvider } from "@/ai/provider";
import { fillTranscriptGaps, isUnclearUtterance } from "@/ai/gapFiller";

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

        // --- Infer endpoint (needs Bee API + AI provider) ---
        if (
          url.pathname.match(/^\/api\/local\/infer\/\d/) &&
          req.method === "POST"
        ) {
          if (!currentToken) {
            return json({ error: "Not logged in" }, 401);
          }
          return await handleInferRun(url);
        }

        // --- Speaker identify (needs Bee API + AI provider) ---
        if (
          url.pathname.match(/^\/api\/local\/speakers\/identify\/\d/) &&
          req.method === "POST"
        ) {
          if (!currentToken) {
            return json({ error: "Not logged in" }, 401);
          }
          return await handleIdentifyRun(url);
        }

        // --- Speaker learn (needs Bee API + AI provider) ---
        if (
          url.pathname === "/api/local/speakers/learn" &&
          req.method === "POST"
        ) {
          if (!currentToken) {
            return json({ error: "Not logged in" }, 401);
          }
          const body = (await req.json()) as { profile_name?: string };
          return await handleLearnRun(body.profile_name);
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

    // Logout
    if (path === "/logout" && req.method === "POST") {
      await clearToken(context.env);
      currentToken = null;
      return json({ ok: true });
    }

    return json({ error: "Not found" }, 404);
  }

  async function handleInferRun(url: URL): Promise<Response> {
    const idStr = url.pathname.slice("/api/local/infer/".length);
    const conversationId = Number.parseInt(idStr, 10);
    if (!Number.isFinite(conversationId) || conversationId <= 0) {
      return json({ error: "Invalid conversation ID" }, 400);
    }

    const provider = resolveAiProvider();
    if (!provider) {
      return json(
        {
          error:
            "No AI provider configured. Add an OpenAI or Anthropic key in Settings first.",
        },
        400
      );
    }

    const headers = new Headers();
    headers.set("Authorization", `Bearer ${currentToken}`);
    const response = await context.client.fetch(
      `/v1/conversations/${conversationId}`,
      { method: "GET", headers }
    );
    if (!response.ok) {
      return json(
        { error: "Failed to fetch conversation" },
        response.status
      );
    }
    const data = (await response.json()) as unknown;
    const utterances = extractUtterancesFromData(data);
    if (utterances.length === 0) {
      return json({ error: "No utterances found in this conversation" }, 400);
    }

    const unclear = utterances.filter((u) => isUnclearUtterance(u.text));
    if (unclear.length === 0) {
      return json({
        conversation_id: conversationId,
        inferences: [],
        total_utterances: utterances.length,
        unclear_count: 0,
      });
    }

    const contextText = utterances
      .map((u) => `[${u.speaker}]: ${u.text}`)
      .join("\n");

    const result = await fillTranscriptGaps(
      provider,
      contextText,
      unclear.map((u) => ({ id: u.id, speaker: u.speaker, text: u.text }))
    );

    const db = getDatabase();
    for (const r of result.results) {
      if (r.confidence > 0.3) {
        const original = unclear.find((u) => u.id === r.utterance_id);
        if (original) {
          upsertInference(
            db,
            conversationId,
            r.utterance_id,
            original.text,
            r.inferred_text,
            r.confidence,
            result.provider,
            result.model
          );
        }
      }
    }

    return json({
      conversation_id: conversationId,
      inferences: result.results,
      total_utterances: utterances.length,
      unclear_count: unclear.length,
      model: result.model,
      provider_name: result.provider,
    });
  }

  async function handleIdentifyRun(url: URL): Promise<Response> {
    const idStr = url.pathname.slice("/api/local/speakers/identify/".length);
    const conversationId = Number.parseInt(idStr, 10);
    if (!Number.isFinite(conversationId) || conversationId <= 0) {
      return json({ error: "Invalid conversation ID" }, 400);
    }

    const provider = resolveAiProvider();
    if (!provider) {
      return json({ error: "No AI provider configured. Add a key in Settings first." }, 400);
    }

    const db = getDatabase();
    const fingerprints = getAllFingerprints(db);
    if (fingerprints.length === 0) {
      return json({ error: "No speaker fingerprints. Assign speakers manually first, then use Learn." }, 400);
    }

    const headers = new Headers();
    headers.set("Authorization", `Bearer ${currentToken}`);
    const response = await context.client.fetch(
      `/v1/conversations/${conversationId}`,
      { method: "GET", headers }
    );
    if (!response.ok) {
      return json({ error: "Failed to fetch conversation" }, response.status);
    }
    const data = (await response.json()) as unknown;
    const utterances = extractUtterancesFromData(data);
    if (utterances.length === 0) {
      return json({ error: "No utterances found" }, 400);
    }

    const profiles = fingerprints.map((fp) => ({
      name: fp.profile_name,
      vocabulary: fp.vocabulary,
      topics: fp.topics,
      patterns: fp.patterns,
    }));

    const results = await identifySpeakers(
      provider,
      utterances.map((u) => ({ speaker: u.speaker, text: u.text })),
      profiles
    );

    // Auto-assign high-confidence matches
    for (const r of results) {
      if (r.profile_name && r.confidence >= 0.8) {
        const profile = getProfileByName(db, r.profile_name);
        if (profile) {
          assignSpeaker(db, conversationId, r.speaker_label, profile.id, r.confidence, "ai");
        }
      }
    }

    return json({ conversation_id: conversationId, results });
  }

  async function handleLearnRun(profileName?: string): Promise<Response> {
    const provider = resolveAiProvider();
    if (!provider) {
      return json({ error: "No AI provider configured. Add a key in Settings first." }, 400);
    }

    const db = getDatabase();
    const results: Array<{ name: string; utterances: number; topics: string[] }> = [];

    const profilesToLearn = profileName
      ? [getProfileByName(db, profileName)].filter(Boolean)
      : listProfiles(db);

    if (profilesToLearn.length === 0) {
      return json({ error: profileName ? `Profile "${profileName}" not found` : "No profiles exist" }, 400);
    }

    for (const profile of profilesToLearn) {
      if (!profile) continue;
      const assignments = getAssignmentsForProfile(db, profile.id);
      if (assignments.length === 0) {
        results.push({ name: profile.name, utterances: 0, topics: [] });
        continue;
      }

      const allUtterances: string[] = [];
      for (const assignment of assignments.slice(0, 20)) {
        const headers = new Headers();
        headers.set("Authorization", `Bearer ${currentToken}`);
        const response = await context.client.fetch(
          `/v1/conversations/${assignment.conversation_id}`,
          { method: "GET", headers }
        );
        if (!response.ok) continue;
        const data = (await response.json()) as unknown;
        const utterances = extractUtterancesFromData(data);
        const matching = utterances
          .filter((u) => u.speaker === assignment.speaker_label)
          .map((u) => u.text);
        allUtterances.push(...matching);
      }

      if (allUtterances.length === 0) {
        results.push({ name: profile.name, utterances: 0, topics: [] });
        continue;
      }

      const fingerprint = await analyzeSpeakerFingerprint(provider, profile.name, allUtterances);
      upsertFingerprint(db, profile.id, fingerprint.vocabulary, fingerprint.topics, fingerprint.patterns, allUtterances.length);
      results.push({ name: profile.name, utterances: allUtterances.length, topics: fingerprint.topics });
    }

    return json({ results });
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
    const db = getDatabase();
    const body = (await req.json()) as { key: string; value: string };
    setConfigValue(db, body.key, body.value);
    return json({ ok: true });
  }
  if (path.startsWith("/config/") && req.method === "DELETE") {
    const key = decodeURIComponent(path.slice("/config/".length));
    const db = getDatabase();
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
    const db = getDatabase();
    const body = (await req.json()) as { name: string; notes?: string };
    const profile = createProfile(db, body.name, body.notes);
    return json(profile);
  }
  if (path === "/speakers/assign" && req.method === "POST") {
    const db = getDatabase();
    const body = (await req.json()) as {
      conversation_id: number;
      speaker_label: string;
      profile_name: string;
    };
    if (!body.conversation_id || !body.speaker_label || !body.profile_name) {
      return json({ error: "conversation_id, speaker_label, and profile_name are required" }, 400);
    }
    const profile = getProfileByName(db, body.profile_name);
    if (!profile) return json({ error: `Profile "${body.profile_name}" not found` }, 404);
    assignSpeaker(db, body.conversation_id, body.speaker_label, profile.id, 1.0, "manual");
    return json({ ok: true });
  }
  if (path === "/speakers/fingerprints" && req.method === "GET") {
    const db = tryOpenDatabase();
    if (!db) return json([]);
    return json(getAllFingerprints(db));
  }
  if (path.startsWith("/speakers/") && req.method === "DELETE") {
    const name = decodeURIComponent(path.slice("/speakers/".length));
    const db = getDatabase();
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

  // --- Integrations CRUD ---
  if (path === "/integrations" && req.method === "GET") {
    const db = tryOpenDatabase();
    if (!db) return json([]);
    return json(listIntegrations(db));
  }
  if (path === "/integrations" && req.method === "POST") {
    const db = getDatabase();
    const body = (await req.json()) as {
      name: string;
      type: "calendar" | "mail";
      provider: "icloud" | "google" | "outlook" | "generic";
      host?: string;
      port?: number;
      username?: string;
      password?: string;
    };
    if (!body.name || !body.type || !body.provider) {
      return json({ error: "name, type, and provider are required" }, 400);
    }
    const defaults = getProviderDefaults(body.provider);
    const host =
      body.host ||
      (body.type === "calendar"
        ? defaults.calendarHost
        : defaults.imapHost) ||
      undefined;
    const port =
      body.port ||
      (body.type === "mail" ? defaults.imapPort : undefined) ||
      undefined;
    createIntegration(db, {
      name: body.name,
      type: body.type,
      provider: body.provider,
      host,
      port,
      username: body.username,
    });
    if (body.password) {
      saveCredential(body.name, { password: body.password });
    }
    return json({ ok: true });
  }
  if (
    path.match(/^\/integrations\/[^/]+\/test$/) &&
    req.method === "POST"
  ) {
    const name = decodeURIComponent(
      path.slice("/integrations/".length, -"/test".length)
    );
    const db = tryOpenDatabase();
    if (!db) return json({ error: "Database unavailable" }, 500);
    const config = getIntegration(db, name);
    if (!config) return json({ error: "Integration not found" }, 404);
    if (config.type === "calendar") {
      const provider = await createCalendarProviderFromConfig(config);
      const calendars = await provider.listCalendars();
      return json({ ok: true, type: "calendar", calendars });
    } else {
      const provider = createMailProviderFromConfig(config);
      const messages = await provider.recent(3);
      await provider.disconnect();
      return json({ ok: true, type: "mail", messages });
    }
  }
  if (path.startsWith("/integrations/") && req.method === "DELETE") {
    const name = decodeURIComponent(path.slice("/integrations/".length));
    const db = getDatabase();
    deleteIntegration(db, name);
    deleteCredential(name);
    return json({ ok: true });
  }

  // --- Inferences (read/clear) ---
  if (path === "/inferences" && req.method === "GET") {
    const db = tryOpenDatabase();
    if (!db) return json([]);
    const convoParam = url.searchParams.get("conversation");
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Number.parseInt(limitParam, 10) : 50;
    if (convoParam) {
      const convoId = Number.parseInt(convoParam, 10);
      return json(getInferencesForConversation(db, convoId));
    }
    return json(listAllInferences(db, limit));
  }
  if (path.match(/^\/inferences\/\d+$/) && req.method === "DELETE") {
    const convoId = Number.parseInt(
      path.slice("/inferences/".length),
      10
    );
    const db = getDatabase();
    clearInferencesForConversation(db, convoId);
    return json({ ok: true });
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

type InferUtterance = { id: number; speaker: string; text: string };

function extractUtterancesFromData(data: unknown): InferUtterance[] {
  if (!data || typeof data !== "object") return [];
  const payload = data as {
    conversation?: {
      transcriptions?: Array<{
        realtime?: boolean;
        utterances?: Array<{
          id?: number;
          speaker?: string;
          text?: string;
        }>;
      }>;
    };
  };
  const transcriptions = payload.conversation?.transcriptions;
  if (!transcriptions || transcriptions.length === 0) return [];

  const nonRealtime = transcriptions.find((t) => !t.realtime);
  const transcription = nonRealtime ?? transcriptions[0];
  if (!transcription?.utterances) return [];

  return transcription.utterances.filter(
    (u): u is { id: number; speaker: string; text: string } =>
      typeof u.id === "number" &&
      typeof u.speaker === "string" &&
      typeof u.text === "string"
  );
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
