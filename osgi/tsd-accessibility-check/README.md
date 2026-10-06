# TSD accessibility check (dotCMS Java plugin)

An OSGi plugin for the Texas School for the Deaf demo (educationdemo.com):
accessibility is enforced in the approval workflow, not left to a checklist.

**Workflow step "Check accessibility".** First on *TSD Page Approval →
Submit for review, Approve & publish, Publish*. When TSD content has
accessibility errors the action stops, nothing is saved, and the editor sees
each problem and how to fix it. Publishing a page whose waiting sections fail
is refused the same way, so a page never goes half live.

**Rules** (`AccessibilityRules.java`, WCAG 2.2) — the parts editors control:

| Rule | WCAG | Blocks |
|---|---|---|
| An image needs a description (`image` → `imageAlt`), and not a file name | 1.1.1 | yes |
| A button with a link needs text, and not "click here", "read more", "here"… | 2.4.4 | yes |
| Rich text: no Heading 1 (the page title is), no skipped levels, images have alt text, links make sense | 1.3.1, 1.1.1, 2.4.4 | yes |
| Quick links need meaningful labels | 2.4.4 | yes |
| A video is captioned or signed in ASL, a promised transcript exists, and the link is a YouTube video | 1.2.2, 1.2.1 | yes |
| Alt text starting "image of…", alt text over 150 characters, long headings in capitals | — | warning |

Colour contrast, focus, keyboard use and captions of the site's own UI belong
to the design system (frontend-education), not to content, so they're not here.

**REST** (backend user or API token), from the same rules, on draft versions:

- `GET /api/v1/tsd/accessibility/content/{identifier}` — one item
- `GET /api/v1/tsd/accessibility/page?site={siteId}&path=/outreach` — every
  section on a page, in page order (the editor's accessibility panel uses this
  through `frontend-education/src/app/api/accessibility/route.ts`)

| File | What it is |
|---|---|
| `Activator.java` | Registers the step and the REST resource on start, removes them on stop |
| `CheckAccessibilityActionlet.java` | The workflow step (`WorkFlowActionlet`); parameter: content type prefix (`Tsd`) |
| `AccessibilityRules.java` | The rules |
| `AccessibilityResource.java` | The REST endpoints (JAX-RS, dotCMS `WebResource` auth) |
| `Report.java`, `Issue.java` | Results |

## Build and install

dotCMS 26's classes are Java 25, so build with **JDK 25** and Maven (the
plugin targets Java 21):

```bash
mvn package                                   # target/tsd-accessibility-check-1.0.0.jar
cd ../../docs && python3 install-accessibility-check.py
```

The installer uploads the jar (same as **Dev Tools → Plugins → Upload**) and
puts the step first on the three actions. `--remove` takes it off again.
`education-editorial.py` rebuilds those actions: run the installer after it
(`build-education.py` does).

Gotchas: Jackson isn't visible to OSGi plugins (`NoClassDefFoundError`), so
rich text is parsed with dotCMS's `com.dotmarketing.util.json`; and dotCMS's
REST JSON writer doesn't serialise Java records, so responses are maps.
