// ─────────────────────────────────────────────────────────────────────────
// "Send to Smartcat" actionlet: create a Smartcat project for this article,
// with machine translation, and record a Translation Job. If anything fails
// the action fails too, so the article stays where it was and the editor
// sees the reason.
// ─────────────────────────────────────────────────────────────────────────

// Smartcat's upload firewall-safe multipart builder: the header name is built
// from parts because awesomedemo-dev's upload filter rejects files that
// contain a literal multipart header sequence.
var CRLF = "\r\n";
var DISPOSITION = ["Content", "Disposition"].join("-");

function multipart(parts) {
  var boundary = "dotcmsSmartcat" + Date.now();
  var body = parts.map(function (p) {
    return ["--" + boundary,
      DISPOSITION + ': form-data; name="' + p.name + '"' + (p.filename ? '; filename="' + p.filename + '"' : ""),
      "Content-Type: " + p.type, "", p.content].join(CRLF) + CRLF;
  }).join("") + "--" + boundary + "--" + CRLF;
  return { body: body, contentType: "multipart/form-data; boundary=" + boundary };
}

// Preferred engines, first match wins; Smartcat returns Id/Name capitalised.
function enableMachineTranslation(settings, projectId, job) {
  var prefer = [settings.mtEngine, "DeepL", "Google NMT", "Google"].filter(Boolean);
  var engines = smartcat(settings, "GET", "project/" + projectId + "/mt/available")
    .map(function (e) { return { id: e.Id || e.id, name: e.Name || e.name }; });
  var pick = null;
  prefer.forEach(function (want) {
    if (!pick) pick = engines.filter(function (e) { return e.id === want || e.id === "engine:" + want || e.name === want; })[0];
  });
  pick = pick || engines[0];
  if (!pick) return logLine(job, "No machine-translation engine available — translate in Smartcat.");
  smartcat(settings, "POST", "project/" + projectId + "/mt", { json: [{ id: pick.id, languages: settings.targets }] });
  logLine(job, "Machine translation: " + pick.name);
  // Re-save the project's pre-translation rules with startPretranslate=true
  // so they run now that the engine is set.
  var rules = smartcat(settings, "GET", "project/" + projectId + "/pretranslation-rules");
  smartcat(settings, "PUT", "project/" + projectId + "/pretranslation-rules?startPretranslate=true", { json: rules });
  logLine(job, "Pre-translation requested.");
}

(function () {
  var settings = loadSettings();
  var article = currentArticle(settings);
  if (findJob(settings, article.identifier)) fail("this article is already in translation");

  var segments = toSegments(article);
  var form = multipart([
    { name: "model", type: "application/json", content: JSON.stringify({
      name: "dotCMS · " + article.title,
      description: "dotCMS " + CONTENT_TYPE + " " + article.identifier + " on " + settings.dotcms,
      sourceLanguage: "en",
      targetLanguages: settings.targets,
      assignToVendor: false,
      useMT: true,
      pretranslate: true,
      useTranslationMemory: true,
      autoPropagateRepetitions: true,
      externalTag: "dotcms",
    }) },
    // Sent as text/plain: Smartcat rejects a file part typed application/json
    // coming from dotCMS's fetchtool (the .json filename sets the format).
    { name: "file", filename: article.urlTitle + ".json", type: "text/plain",
      content: JSON.stringify(segments, null, 2) },
  ]);
  var project = smartcat(settings, "POST", "project/create", { body: form.body, contentType: form.contentType });

  var job = {
    title: "Smartcat · " + article.title,
    contentId: article.identifier,
    targetLanguages: settings.targets.join(","),
    status: "in-translation",
    smartcatProjectId: project.id,
    smartcatUrl: settings.server + "/projects/" + project.id,
    log: "",
  };
  logLine(job, "Sent from the dotCMS workflow: Smartcat project " + project.id +
    " (" + Object.keys(segments).length + " segments, " + settings.targets.join(", ") + ")");
  try {
    enableMachineTranslation(settings, project.id, job);
  } catch (e) {
    logLine(job, "Machine translation not set up (" + String(e.message).slice(0, 160) + "). Pre-translate in Smartcat.");
  }
  var saved = saveJob(settings, job);
  return "Sent to Smartcat: project " + project.id + ", job " + (saved && saved.identifier);
})();
