package com.dotcms.demo.tsd.accessibility;

import com.dotcms.contenttype.model.field.BinaryField;
import com.dotcms.contenttype.model.field.Field;
import com.dotcms.contenttype.model.field.ImageField;
import com.dotcms.contenttype.model.field.StoryBlockField;
import com.dotmarketing.portlets.contentlet.model.Contentlet;
import com.dotmarketing.util.json.JSONArray;
import com.dotmarketing.util.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * The accessibility rules (WCAG 2.2) that editors can get wrong in content. Colours,
 * contrast, focus and keyboard use belong to the site's design system and are fixed
 * in the frontend, so they're not checked here.
 *
 * <ul>
 *   <li>Images need a text alternative (1.1.1), and it can't be a file name.</li>
 *   <li>Links and buttons need text that makes sense on its own (2.4.4).</li>
 *   <li>Rich text keeps one main heading per page and doesn't skip levels (1.3.1).</li>
 *   <li>Videos are captioned or signed in ASL (1.2.2), and a promised transcript exists (1.2.1).</li>
 * </ul>
 */
public final class AccessibilityRules {

    /** Link text that means nothing out of context, as screen-reader users often hear links. */
    static final Set<String> VAGUE_LINK_TEXT = Set.of(
            "click here", "click", "here", "read more", "more", "link", "this link", "this",
            "go", "learn more here", "more info", "details");

    private static final Pattern FILE_NAME = Pattern.compile(
            "(?i)^\\S+\\.(jpe?g|png|gif|webp|svg|heic|tiff?)$|^(img|dsc|image|photo)[_-]?\\d+");
    private static final Pattern REDUNDANT_ALT = Pattern.compile(
            "(?i)^(an? )?(image|picture|photo|photograph|graphic) (of|showing)\\b");

    private AccessibilityRules() {
    }

    /** Every issue in the content's fields, errors and warnings. */
    public static Report check(Contentlet content) {
        List<Field> fields = content.getContentType().fields();
        Map<String, Field> byVariable = fields.stream()
                .collect(Collectors.toMap(Field::variable, Function.identity(), (a, b) -> a));
        List<Issue> issues = new ArrayList<>();
        for (Field field : fields) {
            String value = text(content, field.variable());
            if (field instanceof ImageField || field instanceof BinaryField) {
                checkImage(content, field, byVariable, value, issues);
            } else if (field instanceof StoryBlockField && !value.isBlank()) {
                checkRichText(field, value, issues);
            } else if (field.variable().endsWith("Link") && !value.isBlank()) {
                checkButton(content, field, byVariable, issues);
            }
        }
        checkHeadingCase(content, byVariable, issues);
        if ("TsdQuickLinks".equals(content.getContentType().variable())) {
            checkQuickLinks(text(content, "items"), issues);
        }
        if (byVariable.containsKey("videoAccessibility")) {
            checkVideo(content, byVariable, issues);
        }
        return Report.of(content.getIdentifier(), content.getTitle(), content.getContentType().variable(), issues);
    }

    // ── Images (WCAG 1.1.1) ────────────────────────────────────────────────

    /** An image field "image" is described by its text field "imageAlt". */
    private static void checkImage(Contentlet content, Field image, Map<String, Field> fields, String value,
                                   List<Issue> issues) {
        Field altField = fields.get(image.variable() + "Alt");
        if (value.isBlank() || altField == null) {
            return;
        }
        checkAltText(altField.name(), text(content, altField.variable()), issues);
    }

    static void checkAltText(String where, String alt, List<Issue> issues) {
        String trimmed = alt.trim();
        if (trimmed.isEmpty()) {
            issues.add(new Issue(where, "The image has no description. Describe what it shows "
                    + "(or the text it contains) for people who can't see it.", true));
        } else if (FILE_NAME.matcher(trimmed).find()) {
            issues.add(new Issue(where, "\"" + trimmed + "\" is a file name, not a description. "
                    + "Describe what the image shows.", true));
        } else {
            if (REDUNDANT_ALT.matcher(trimmed).find()) {
                issues.add(new Issue(where, "Screen readers already say \"image\": start with what it "
                        + "shows instead of \"" + trimmed.split(" ", 3)[0] + " "
                        + trimmed.split(" ", 3)[1] + "…\".", false));
            }
            if (trimmed.length() > 150) {
                issues.add(new Issue(where, "The description is " + trimmed.length() + " characters. "
                        + "Keep it under 150; put longer explanations in the text.", false));
            }
        }
    }

    // ── Links and buttons (WCAG 2.4.4) ─────────────────────────────────────

    /** A link field "ctaLink" is labelled by its text field "ctaText". */
    private static void checkButton(Contentlet content, Field link, Map<String, Field> fields, List<Issue> issues) {
        String prefix = link.variable().substring(0, link.variable().length() - "Link".length());
        Field textField = fields.get(prefix + "Text");
        if (textField == null) {
            return;
        }
        String label = text(content, textField.variable()).trim();
        if (label.isEmpty()) {
            issues.add(new Issue(textField.name(), "This button has a link but no text, so it can't be "
                    + "seen or read out. Add text, or remove the link.", true));
        } else {
            checkLinkText(textField.name(), label, issues);
        }
    }

    static void checkLinkText(String where, String label, List<Issue> issues) {
        String normalized = label.toLowerCase(Locale.ROOT).replaceAll("[^a-z ]", "").trim();
        if (VAGUE_LINK_TEXT.contains(normalized)) {
            issues.add(new Issue(where, "\"" + label + "\" doesn't say where the link goes. Screen-reader "
                    + "users often hear links on their own: use text like \"Read about our welding "
                    + "program\".", true));
        }
    }

    /** Quick links are "Label | link | icon", one per line. */
    private static void checkQuickLinks(String items, List<Issue> issues) {
        for (String line : items.split("\\r?\\n")) {
            String[] parts = line.split("\\|");
            if (parts.length > 1 && !parts[1].isBlank()) {
                String label = parts[0].trim();
                if (label.isEmpty()) {
                    issues.add(new Issue("Links", "A quick link has no label: " + line.trim(), true));
                } else {
                    checkLinkText("Links", label, issues);
                }
            }
        }
    }

    /** Long headings in capitals are hard to read and some screen readers spell them out. */
    private static void checkHeadingCase(Contentlet content, Map<String, Field> fields, List<Issue> issues) {
        for (String variable : List.of("title", "heading")) {
            Field field = fields.get(variable);
            String value = field == null ? "" : text(content, variable).trim();
            if (value.length() > 20 && value.equals(value.toUpperCase(Locale.ROOT))
                    && value.chars().anyMatch(Character::isLetter)) {
                issues.add(new Issue(field.name(), "\"" + value + "\" is all in capitals. Use sentence case; "
                        + "the design can style it.", false));
            }
        }
    }

    // ── Video (WCAG 1.2.1, 1.2.2) ──────────────────────────────────────────

    private static final Pattern YOUTUBE = Pattern.compile(
            "^https?://(www\\.|m\\.)?(youtube\\.com/(watch\\?.*v=|embed/|shorts/|live/)|youtu\\.be/)[A-Za-z0-9_-]{11}");

    /**
     * A video needs captions or ASL — at a school for the Deaf, an uncaptioned video
     * leaves out its own community. The editor confirms which, and a promised
     * transcript must be there.
     */
    private static void checkVideo(Contentlet content, Map<String, Field> fields, List<Issue> issues) {
        String url = text(content, "youtubeUrl").trim();
        String access = text(content, "videoAccessibility").toLowerCase(Locale.ROOT);
        String where = fields.get("videoAccessibility").name();
        if (!url.isEmpty() && !YOUTUBE.matcher(url).find()) {
            issues.add(new Issue(fields.containsKey("youtubeUrl") ? fields.get("youtubeUrl").name() : "Video",
                    "\"" + url + "\" isn't a YouTube video link. Copy it from the video's Share button.", true));
        }
        if (!access.contains("captions") && !access.contains("asl")) {
            issues.add(new Issue(where, "Confirm the video is captioned or signed in ASL. Videos without "
                    + "either can't be followed by Deaf viewers.", true));
        }
        if (access.contains("transcript") && text(content, "transcript").isBlank()) {
            issues.add(new Issue(where, "\"A transcript is provided below\" is ticked, but the Transcript "
                    + "is empty. Add it, or untick the box.", true));
        }
    }

    // ── Rich text (WCAG 1.3.1, 1.1.1, 2.4.4) ───────────────────────────────

    // dotCMS's own JSON classes: Jackson isn't visible to OSGi plugins.
    private static void checkRichText(Field field, String json, List<Issue> issues) {
        JSONObject doc;
        try {
            doc = new JSONObject(json);
        } catch (Exception e) {
            return;
        }
        // The page's title is its one Heading 1, so text starts at Heading 2.
        int[] previous = {1};
        walk(doc, node -> {
            String type = node.optString("type");
            JSONObject attrs = node.optJSONObject("attrs");
            if (attrs == null) {
                attrs = new JSONObject();
            }
            if ("heading".equals(type)) {
                int level = attrs.optInt("level", 2);
                String text = plainText(node);
                if (level == 1) {
                    issues.add(new Issue(field.name(), "\"" + text + "\" is a Heading 1, but the page title "
                            + "is already the main heading. Use Heading 2.", true));
                } else if (level > previous[0] + 1) {
                    issues.add(new Issue(field.name(), "\"" + text + "\" jumps from Heading " + previous[0]
                            + " to Heading " + level + ". Don't skip levels: use Heading "
                            + (previous[0] + 1) + ".", true));
                }
                previous[0] = level;
            } else if (type.equals("dotImage") || type.equals("image")) {
                JSONObject data = attrs.optJSONObject("data");
                String alt = attrs.optString("alt", data == null ? "" : data.optString("alt", ""));
                checkAltText(field.name() + " (image in the text)", alt, issues);
            }
            if ("paragraph".equals(type) || "heading".equals(type) || "listItem".equals(type)) {
                checkLinksIn(field.name(), node, issues);
            }
        });
    }

    /** Link text in a block: consecutive text runs that share a link. */
    private static void checkLinksIn(String where, JSONObject block, List<Issue> issues) {
        String href = null;
        StringBuilder label = new StringBuilder();
        for (JSONObject child : children(block)) {
            String childHref = linkOf(child);
            if (href != null && !href.equals(childHref)) {
                checkLinkText(where, label.toString().trim(), issues);
                label.setLength(0);
            }
            href = childHref;
            if (href != null) {
                label.append(child.optString("text", ""));
            }
        }
        if (href != null) {
            checkLinkText(where, label.toString().trim(), issues);
        }
    }

    private static String linkOf(JSONObject textNode) {
        JSONArray marks = textNode.optJSONArray("marks");
        for (int i = 0; marks != null && i < marks.length(); i++) {
            JSONObject mark = marks.optJSONObject(i);
            if (mark != null && "link".equals(mark.optString("type"))) {
                JSONObject attrs = mark.optJSONObject("attrs");
                return attrs == null ? "" : attrs.optString("href", "");
            }
        }
        return null;
    }

    private static List<JSONObject> children(JSONObject node) {
        List<JSONObject> out = new ArrayList<>();
        JSONArray content = node.optJSONArray("content");
        for (int i = 0; content != null && i < content.length(); i++) {
            JSONObject child = content.optJSONObject(i);
            if (child != null) {
                out.add(child);
            }
        }
        return out;
    }

    private static void walk(JSONObject node, java.util.function.Consumer<JSONObject> visit) {
        visit.accept(node);
        for (JSONObject child : children(node)) {
            walk(child, visit);
        }
    }

    private static String plainText(JSONObject node) {
        StringBuilder out = new StringBuilder();
        walk(node, n -> out.append(n.optString("text", "")));
        return out.toString().trim();
    }

    private static String text(Contentlet content, String variable) {
        Object value = content.get(variable);
        return value == null ? "" : value.toString();
    }
}
