// ─────────────────────────────────────────────────────────────────────────
// Shared helpers for the Smartcat workflow actionlets (JavaScript Actionlet).
// docs/build-sandler.py prepends this file to send.js and check.js and puts
// the result in each actionlet's `javascriptCode` parameter.
//
// Runs server-side in dotCMS (GraalJS). Available there: fetchtool (sync
// HTTP), dotcontent, request (the HTTP request that fired the action).
// Not available: btoa, setTimeout, Promises that the engine will await.
//
// Content is read and written through dotCMS's own REST API (with the token
// from the Smartcat Settings item), because in this sandbox the actionlet's
// content objects expose select and date fields only as opaque Java values.
// ─────────────────────────────────────────────────────────────────────────

// The translation workflow is found by its "Send to Smartcat" action, not by
// name, so renaming it in dotCMS doesn't break anything.
var MARKER_ACTION = "Send to Smartcat";
var CONTENT_TYPE = "SandlerArticle";
var TEXT_FIELDS = ["title", "teaser"]; // plus the Block Editor `body`

function fail(message) {
  throw new Error("Smartcat: " + message);
}

// Busy-wait: the sandbox has no setTimeout.
function sleep(ms) {
  var end = Date.now() + ms;
  while (Date.now() < end) {}
}

// UTF-8 safe Base64 (no btoa in the sandbox).
function base64(text) {
  var bytes = unescape(encodeURIComponent(text));
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var out = "";
  for (var i = 0; i < bytes.length; i += 3) {
    var a = bytes.charCodeAt(i), b = bytes.charCodeAt(i + 1), c = bytes.charCodeAt(i + 2);
    var n = (a << 16) | ((b || 0) << 8) | (c || 0);
    out += chars[(n >> 18) & 63] + chars[(n >> 12) & 63] +
      (i + 1 < bytes.length ? chars[(n >> 6) & 63] : "=") +
      (i + 2 < bytes.length ? chars[n & 63] : "=");
  }
  return out;
}

// The one Smartcat Settings item (restricted to administrators). It exists
// in the default language only; the language is named in the query because
// dotcontent.pull otherwise adds the editor session's current language
// (e.g. Spanish after previewing a Spanish page) and finds nothing.
function loadSettings() {
  var found = dotcontent.pull("+contentType:SmartcatSettings +live:true +languageId:1", 1, "modDate desc");
  var s = found && (found.length ? found[0] : found.get ? found.get(0) : null);
  if (!s) fail("no published Smartcat Settings content found");
  var get = function (name) {
    var v = s.get(name);
    return v === null || v === undefined ? "" : String(v).trim();
  };
  var settings = {
    accountId: get("accountId"),
    apiKey: get("apiKey"),
    server: (get("server") || "https://smartcat.ai").replace(/\/$/, "").replace(/smartcat\.com$/, "smartcat.ai"),
    targets: (get("targets") || "es,fr").split(",").map(function (x) { return x.trim(); }).filter(Boolean),
    mtEngine: get("mtEngine"),
    dotcmsToken: get("dotcmsToken"),
    siteId: get("siteId"),
  };
  if (!settings.accountId || !settings.apiKey) fail("Smartcat account ID and API key are not set");
  if (!settings.dotcmsToken) fail("the dotCMS API token is not set in Smartcat Settings");
  // dotCMS base URL = the host that fired this action.
  settings.dotcms = String(request.getUrl()).replace(/^(https?:\/\/[^/]+).*$/, "$1");
  return settings;
}

function parseJson(text, what) {
  try {
    return JSON.parse(text);
  } catch (e) {
    fail(what + " returned something that isn't JSON: " + String(text).slice(0, 200));
  }
}

// ─── dotCMS REST ──────────────────────────────────────────────────────────

// Two fetchtool quirks handled here:
//  - it calls toString() on every option it's given, so leave `body` out
//    entirely (not undefined) when there isn't one;
//  - it crashes on responses with no body (e.g. 204 No Content), after the
//    request has been made. Treat that as an empty, successful response.
var EMPTY_RESPONSE = { getStatus: function () { return 204; }, getBody: function () { return ""; } };

function request_(url, method, headers, body) {
  var options = { method: method, headers: headers };
  if (body !== undefined && body !== null) options.body = body;
  try {
    return fetchtool.fetch(url, options);
  } catch (e) {
    if (/getEntity\(\)" is null|HttpEntity\.getContent/.test(String(e))) return EMPTY_RESPONSE;
    throw e;
  }
}

function dotcms(settings, method, path, body) {
  var r = request_(settings.dotcms + path, method,
    { Authorization: "Bearer " + settings.dotcmsToken, "Content-Type": "application/json" },
    body === undefined ? undefined : JSON.stringify(body));
  var text = String(r.getBody());
  if (r.getStatus() >= 300) fail("dotCMS " + method + " " + path + " → " + r.getStatus() + ": " + text.slice(0, 200));
  return text ? parseJson(text, "dotCMS " + path) : null;
}

function search(settings, query, limit) {
  return dotcms(settings, "POST", "/api/content/_search", { query: query, limit: limit || 50 })
    .entity.jsonObjectView.contentlets;
}

function workflowActions(settings) {
  var schemes = dotcms(settings, "GET", "/api/v1/workflow/schemes").entity
    .filter(function (s) { return !s.archived; });
  for (var i = 0; i < schemes.length; i++) {
    var actions = {};
    dotcms(settings, "GET", "/api/v1/workflow/schemes/" + schemes[i].id + "/actions").entity
      .forEach(function (a) { actions[a.name] = a.id; });
    if (actions[MARKER_ACTION]) return actions;
  }
  fail('no workflow with a "' + MARKER_ACTION + '" action found');
}

function fireAction(settings, actionId, contentlet) {
  return dotcms(settings, "PUT", "/api/v1/workflow/actions/" + actionId + "/fire", { contentlet: contentlet }).entity;
}

// Which content was this action fired on? The dotCMS editor sends it in the
// request body, which the actionlet can't read (already consumed), and the
// sandbox blocks the `contentlet` object's methods. So a Velocity sub-action
// that runs first (see FIRED_INODE_VTL in docs/build-sandler.py) puts the
// inode in dotCMS's cache; read it here and clear it. API calls that pass
// ?inode= or ?identifier= in the URL work too.
var FIRED_INODE_KEY = "smartcat-fired-inode";

function firedInode() {
  var inode = null;
  try {
    inode = dotcache.get(FIRED_INODE_KEY);
    if (inode) dotcache.remove(FIRED_INODE_KEY);
  } catch (e) {}
  return inode ? String(inode) : null;
}

// The article this action was fired on (English version), as plain JSON.
function currentArticle(settings) {
  var inode = firedInode() || request.getParameter("inode");
  var identifier = request.getParameter("identifier");
  var query = inode ? "+inode:" + inode : identifier ? "+identifier:" + identifier + " +languageId:1" : null;
  if (!query) fail("couldn't tell which content this action was fired on");
  var found = search(settings, query, 1)[0];
  if (!found) fail("content not found (" + query + ")");
  if (found.contentType !== CONTENT_TYPE) fail("only " + CONTENT_TYPE + " content is supported");
  if (Number(found.languageId) !== 1) fail("send the English version of the article");
  return found;
}

// ─── Translation Job records ──────────────────────────────────────────────

function stamp() {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}

function findJob(settings, contentId) {
  var jobs = search(settings, "+contentType:TranslationJob +TranslationJob.contentId:" + contentId +
    " +TranslationJob.status:in-translation +deleted:false", 5);
  return jobs[0] || null;
}

function saveJob(settings, job) {
  var fields = {
    contentType: "TranslationJob", site: settings.siteId, languageId: 1,
    title: job.title, contentId: job.contentId, sourceType: job.sourceType || CONTENT_TYPE,
    targetLanguages: job.targetLanguages, status: job.status,
    smartcatProjectId: job.smartcatProjectId || "", smartcatUrl: job.smartcatUrl || "",
    importedLanguages: job.importedLanguages || "", log: job.log || "",
  };
  if (job.identifier) fields.identifier = job.identifier;
  return dotcms(settings, "PUT", "/api/v1/workflow/actions/default/fire/PUBLISH", { contentlet: fields }).entity;
}

function logLine(job, line) {
  job.log = (job.log ? job.log + "\n" : "") + stamp() + "  " + line;
}

// ─── Smartcat REST ────────────────────────────────────────────────────────

function smartcat(settings, method, path, options) {
  options = options || {};
  var headers = { Authorization: "Basic " + base64(settings.accountId + ":" + settings.apiKey) };
  if (options.contentType) headers["Content-Type"] = options.contentType;
  else if (options.json !== undefined) headers["Content-Type"] = "application/json";
  var r = request_(settings.server + "/api/integration/v1/" + path, method, headers,
    options.body !== undefined ? options.body : options.json !== undefined ? JSON.stringify(options.json) : undefined);
  if (options.raw) return r;
  var text = String(r.getBody());
  if (r.getStatus() >= 300) fail(method + " " + path + " → " + r.getStatus() + ": " + text.slice(0, 200));
  return text ? parseJson(text, "Smartcat " + path) : null;
}

// ─── Article ⇄ key-value JSON ─────────────────────────────────────────────

function parseBody(body) {
  if (!body) return null;
  return typeof body === "string" ? JSON.parse(body) : body;
}

function textNodes(node, path, out) {
  path = path || [];
  out = out || [];
  if (node.type === "text" && node.text && node.text.trim()) out.push({ path: path, node: node });
  (node.content || []).forEach(function (child, i) { textNodes(child, path.concat([i]), out); });
  return out;
}

function toSegments(article) {
  var segments = {};
  TEXT_FIELDS.forEach(function (f) { if (article[f]) segments[f] = article[f]; });
  var body = parseBody(article.body);
  if (body) textNodes(body).forEach(function (t) { segments["body/" + t.path.join("/")] = t.node.text; });
  return segments;
}

function fromSegments(article, translated) {
  var fields = {};
  TEXT_FIELDS.forEach(function (f) { if (article[f]) fields[f] = translated[f] || article[f]; });
  var body = parseBody(article.body);
  if (body) {
    var copy = JSON.parse(JSON.stringify(body));
    textNodes(copy).forEach(function (t) {
      var value = translated["body/" + t.path.join("/")];
      if (value) t.node.text = value;
    });
    fields.body = JSON.stringify(copy);
  }
  return fields;
}

function dotcmsDate(value) {
  if (typeof value === "number") return new Date(value).toISOString().slice(0, 19).replace("T", " ");
  return String(value || "").replace(/\.\d+$/, "");
}
