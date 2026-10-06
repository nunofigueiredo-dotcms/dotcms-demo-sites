package com.dotcms.demo.tsd.accessibility;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** The result of checking one piece of content. */
public record Report(String identifier, String title, String contentType, List<Issue> errors, List<Issue> warnings) {

    static Report of(String identifier, String title, String contentType, List<Issue> issues) {
        List<Issue> errors = new ArrayList<>();
        List<Issue> warnings = new ArrayList<>();
        for (Issue issue : issues) {
            (issue.blocking() ? errors : warnings).add(issue);
        }
        return new Report(identifier, title, contentType, errors, warnings);
    }

    public boolean passes() {
        return errors.isEmpty();
    }

    /** Plain maps for the REST response (dotCMS's JSON writer doesn't serialise records). */
    public Map<String, Object> toMap() {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("identifier", identifier);
        map.put("title", title);
        map.put("contentType", contentType);
        map.put("errors", errors.stream().map(Report::issue).toList());
        map.put("warnings", warnings.stream().map(Report::issue).toList());
        return map;
    }

    private static Map<String, Object> issue(Issue issue) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("field", issue.field());
        map.put("message", issue.message());
        map.put("blocking", issue.blocking());
        return map;
    }
}
