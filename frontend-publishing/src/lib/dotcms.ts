// Server-side access to dotCMS. Everything here runs on the server with a
// read-only token (the hub service account, Hub Reader role). The token is
// never sent to the browser.
import { cache } from "react";
import { createDotCMSClient } from "@dotcms/client";
import type { Article, HubUser, LocalisedMessage, MessagingSot, PageResponse, WorkflowComment, WorkflowState } from "./types";
import { first } from "./types";

export const DOTCMS_URL = (process.env.DOTCMS_URL || process.env.NEXT_PUBLIC_DOTCMS_HOST || "http://localhost:8082").replace(/\/$/, "");
const TOKEN = process.env.DOTCMS_READ_TOKEN || "";
export const SITE_ID = process.env.DOTCMS_SITE_ID || "";

const client = createDotCMSClient({ dotcmsUrl: DOTCMS_URL, authToken: TOKEN || "not-configured", siteId: SITE_ID });

/** How the page is viewed: on the site, or in the Universal Visual Editor. */
export type PageMode = "LIVE" | "EDIT" | "PREVIEW";

/** A dotCMS page (and, for article and topic URLs, the item it maps to). */
export const getPage = cache(async (path: string, mode: PageMode, languageId = 1) => {
  try {
    return (await client.page.get(path, { mode, languageId, siteId: SITE_ID })) as PageResponse;
  } catch (e) {
    console.error(`dotCMS page ${path}: ${(e as Error).message}`);
    return null;
  }
});

async function rest<T>(path: string, init: RequestInit = {}, cookie?: string): Promise<T | null> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(init.headers as Record<string, string>) };
  if (cookie) headers.Cookie = cookie;
  else headers.Authorization = `Bearer ${TOKEN}`;
  try {
    const res = await fetch(`${DOTCMS_URL}${path}`, { ...init, headers, cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (e) {
    console.error(`dotCMS ${path}: ${(e as Error).message}`);
    return null;
  }
}

interface SearchResponse<T> {
  entity?: { jsonObjectView?: { contentlets?: T[] } };
}

/** Lucene search on this site. Returns working (latest) versions unless `live`. */
export async function search<T>(query: string, { limit = 200, live = false, depth = 0 }: { limit?: number; live?: boolean; depth?: number } = {}) {
  const q = `${query} +conHost:${SITE_ID} +deleted:false ${live ? "+live:true" : "+working:true"}`;
  const r = await rest<SearchResponse<T>>("/api/content/_search", {
    method: "POST",
    body: JSON.stringify({ query: q, limit, depth }),
  });
  return r?.entity?.jsonObjectView?.contentlets ?? [];
}

/** One item with its relationships. Unlike search, this follows relationships
 * across languages (a German message → its English source of truth). */
export async function getWithRelations<T>(inodeOrId: string): Promise<T | null> {
  const r = await rest<{ entity?: T }>(`/api/v1/content/${inodeOrId}?depth=1`);
  return r?.entity ?? null;
}

export const getWorkflowState = cache(async (inode: string): Promise<WorkflowState | null> => {
  const r = await rest<{ entity?: { step?: { name: string; resolved: boolean }; task?: { assignedTo?: string; createdBy?: string; id?: string } } }>(
    `/api/v1/workflow/status/${inode}`,
  );
  const e = r?.entity;
  if (!e?.step) return null;
  return { step: e.step.name, resolved: e.step.resolved, assignedTo: e.task?.assignedTo, createdBy: e.task?.createdBy, taskId: e.task?.id };
});

export async function getHistory(identifier: string, languageId = 1): Promise<WorkflowComment[]> {
  const r = await rest<{ entity?: WorkflowComment[] }>(`/api/v1/workflow/tasks/history/comments/${identifier}?language=${languageId}`);
  return r?.entity ?? [];
}

export const getLanguages = cache(async (): Promise<Record<number, string>> => {
  const r = await rest<{ entity?: { id: number; isoCode: string }[] }>("/api/v2/languages");
  return Object.fromEntries((r?.entity ?? []).map((l) => [l.id, l.isoCode]));
});

/** Display labels of a select field ("Eleanor Shaw, Messaging Owner|email" → email: label). */
export const getFieldLabels = cache(async (type: string, field: string): Promise<Record<string, string>> => {
  const r = await rest<{ entity?: { fields?: { variable: string; values?: string }[] } }>(`/api/v1/contenttype/id/${type}`);
  const values = r?.entity?.fields?.find((f) => f.variable === field)?.values ?? "";
  return Object.fromEntries(
    values.split(/\r?\n/).filter(Boolean).map((line) => {
      const [label, value] = line.split("|");
      return [value?.trim() ?? label.trim(), label.trim()];
    }),
  );
});

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------

export async function getSources({ status, q, topic }: { status?: "current" | "superseded"; q?: string; topic?: string } = {}) {
  const parts = ["+contentType:PdMessagingSot"];
  if (status) parts.push(`+PdMessagingSot.status:${status}`);
  if (topic) parts.push(`+categories:${topic}`);
  if (q) {
    // Words match as prefixes ("transform" finds "transformative"); numbers and
    // short words must match exactly ("2,000").
    const terms = q
      .split(/\s+/)
      .map((w) => w.replace(/[^\p{L}\p{N},.-]/gu, "").replace(/[.,-]+$/, "").toLowerCase())
      .filter(Boolean)
      .map((w) => (/^\p{L}{3,}$/u.test(w) ? `+catchall:${w}*` : `+catchall:"${w}"`));
    if (terms.length) parts.push(terms.join(" "));
  }
  // Sorted here: a dotCMS sort on a field that isn't sortable silently returns nothing.
  // depth 1: include the version each one supersedes (same language, so search can follow it)
  const found = await search<MessagingSot>(parts.join(" "), { live: true, depth: 1 });
  return found.sort((a, b) => a.title.localeCompare(b.title));
}

export async function getSourceVersions(sotKey: string) {
  const versions = await search<MessagingSot>(`+contentType:PdMessagingSot +PdMessagingSot.sotKey:"${sotKey}"`, { live: true });
  return versions.sort((a, b) => Number(b.version) - Number(a.version));
}

/** Every localised message of a topic (all versions of its source of truth),
 * in any language, with its parent and workflow state. */
export async function getLocalisedFor(sotIdentifiers: string[]) {
  const messages = await search<LocalisedMessage>("+contentType:PdLocalisedMessage");
  const withParents = await Promise.all(
    messages.map(async (m) => {
      const full = await getWithRelations<LocalisedMessage>(m.inode);
      return { ...m, parentSot: full?.parentSot ?? m.parentSot };
    }),
  );
  const mine = withParents.filter((m) => {
    const parent = first(m.parentSot);
    return parent && sotIdentifiers.includes(parent.identifier);
  });
  return Promise.all(
    mine.map(async (m) => {
      const state = await getWorkflowState(m.inode);
      const history = await getHistory(m.identifier, m.languageId);
      const lastComment = history.find((h) => h.type === "WorkflowComment");
      return { message: m, state, lastComment };
    }),
  );
}

export async function getArticles() {
  const found = await search<Article>("+contentType:PdArticle", { live: true });
  return found.sort((a, b) => String(b.lastReviewed ?? "").localeCompare(String(a.lastReviewed ?? "")));
}

// ---------------------------------------------------------------------------
// Hub session: a signed-in user's own dotCMS session (cookies), never the token
// ---------------------------------------------------------------------------

/** Sign in to dotCMS as the user. Returns their session cookies and who they are. */
export async function login(email: string, password: string): Promise<{ cookie: string; name: string; backendUser: boolean } | null> {
  try {
    const res = await fetch(`${DOTCMS_URL}/api/v1/authentication`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: email, password, rememberMe: false }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { entity?: { firstName?: string; lastName?: string; emailAddress?: string; backendUser?: boolean } };
    const cookies = res.headers.getSetCookie().map((c) => c.split(";")[0]);
    if (!cookies.length || !body.entity) return null;
    const u = body.entity;
    return {
      cookie: cookies.join("; "),
      name: [u.firstName, u.lastName].filter(Boolean).join(" ") || (u.emailAddress ?? email),
      backendUser: u.backendUser === true,
    };
  } catch {
    return null;
  }
}

export async function currentUser(cookie: string): Promise<HubUser | null> {
  const u = await rest<{ userId: string; roleId: string; firstName?: string; lastName?: string; email?: string; givenName?: string; surname?: string }>(
    "/api/v1/users/current", {}, cookie,
  );
  if (!u?.userId) return null;
  return {
    userId: u.userId, roleId: u.roleId, email: u.email ?? "",
    name: [u.firstName ?? u.givenName, u.lastName ?? u.surname].filter(Boolean).join(" ") || (u.email ?? ""),
  };
}

interface TaskSearch {
  entity?: { workflowTasks?: { id: string; title: string; languageId: number }[] };
}

/** Ids of the open workflow tasks assigned to the user or their roles. */
export async function tasksForUser(cookie: string, schemeId?: string): Promise<Set<string>> {
  const r = await rest<TaskSearch>("/api/v1/workflow/tasks", {
    method: "POST",
    body: JSON.stringify({ show4all: true, open: true, count: 100, page: 0, ...(schemeId ? { schemeId } : {}) }),
  }, cookie);
  return new Set((r?.entity?.workflowTasks ?? []).map((t) => t.id));
}

export const getSchemeId = cache(async () => {
  const r = await rest<{ entity?: { id: string; name: string }[] }>("/api/v1/workflow/schemes");
  return r?.entity?.find((s) => s.name === "Governed Content")?.id;
});

/** Every governed item on the site with its workflow state (for "My items in review"). */
export async function getGovernedItems() {
  const types = ["PdMessagingSot", "PdLocalisedMessage", "PdArticle", "PdNewsletterIssue", "PdAssetPack"];
  const items = await search<(MessagingSot | LocalisedMessage | Article) & { contentType: string }>(
    `+(${types.map((t) => `contentType:${t}`).join(" ")})`,
  );
  return Promise.all(items.map(async (item) => ({ item, state: await getWorkflowState(item.inode) })));
}
