// ─────────────────────────────────────────────────────────────────────────
// "Check Smartcat" actionlet: for this article's open Translation Job,
// import every language Smartcat has translated as that language's version
// of the article, in "Translation ready for review". A language counts as
// translated once Smartcat has completed it or finished pre-translating it
// (machine translation), so a demo doesn't wait for linguist review.
// ─────────────────────────────────────────────────────────────────────────

function exportDocument(settings, documentId) {
  var task = smartcat(settings, "POST", "document/export?documentIds=" + documentId + "&type=target");
  for (var i = 0; i < 20; i++) {
    var r = smartcat(settings, "GET", "document/export/" + task.id, { raw: true });
    if (r.getStatus() === 200) return String(r.getBody());
    if (r.getStatus() !== 204) fail("export of " + documentId + " → " + r.getStatus());
    sleep(1500);
  }
  fail("export of " + documentId + " wasn't ready after 30s — try again shortly");
}

(function () {
  var settings = loadSettings();
  var article = currentArticle(settings);
  var job = findJob(settings, article.identifier);
  if (!job) fail("no open Translation Job for this article — send it to Smartcat first");

  var actions = workflowActions(settings);
  var languages = {};
  dotcms(settings, "GET", "/api/v2/languages").entity.forEach(function (l) { languages[l.languageCode] = l.id; });

  var project = smartcat(settings, "GET", "project/" + job.smartcatProjectId);
  var targets = String(job.targetLanguages || "").split(",").filter(Boolean);
  var imported = String(job.importedLanguages || "").split(",").filter(Boolean);
  var report = [];

  (project.documents || []).forEach(function (doc) {
    var lang = doc.targetLanguage;
    if (imported.indexOf(lang) >= 0 || targets.indexOf(lang) < 0) return;
    var ready = String(doc.status).toLowerCase() === "completed" || doc.pretranslateCompleted === true;
    if (!ready) {
      report.push(lang + ": " + doc.status + " (not translated yet)");
      return;
    }
    if (!languages[lang]) {
      logLine(job, lang + ": no matching language in dotCMS — skipped");
      return;
    }
    var translated = parseJson(exportDocument(settings, doc.id), "Smartcat export");
    var fields = fromSegments(article, translated);
    fields.identifier = article.identifier;
    fields.languageId = languages[lang];
    fields.contentType = CONTENT_TYPE;
    fields.site = settings.siteId;
    fields.urlTitle = article.urlTitle;
    fields.category = article.category;
    fields.publishDate = dotcmsDate(article.publishDate);
    fireAction(settings, actions["Import translation"], fields);
    imported.push(lang);
    logLine(job, lang + ": imported into dotCMS for review" +
      (String(doc.status).toLowerCase() === "completed" ? "" : " (machine translation; Smartcat review not complete)"));
    report.push(lang + ": imported for review");
  });

  job.importedLanguages = imported.join(",");
  var done = targets.every(function (l) { return imported.indexOf(l) >= 0; });
  if (done) {
    job.status = "imported";
    logLine(job, "All languages imported — review and publish each translation.");
  }
  saveJob(settings, job);
  return (done ? "All languages imported. " : "") + report.join("; ");
})();
