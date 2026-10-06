package com.dotcms.demo.tsd.accessibility;

import com.dotcms.rest.ResponseEntityView;
import com.dotcms.rest.WebResource;
import com.dotmarketing.beans.Host;
import com.dotmarketing.beans.MultiTree;
import com.dotmarketing.business.APILocator;
import com.dotmarketing.portlets.contentlet.model.Contentlet;
import com.dotmarketing.portlets.htmlpageasset.model.IHTMLPage;
import com.dotmarketing.util.Logger;
import com.liferay.portal.model.User;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Accessibility reports for editors and tools, from the same rules as the workflow step.
 * Checks the working (draft) version, so editors see problems before they submit.
 *
 * <ul>
 *   <li>GET /api/v1/tsd/accessibility/content/{identifier}?language=1 — one item</li>
 *   <li>GET /api/v1/tsd/accessibility/page?site={siteId}&amp;path=/outreach — every section on a page</li>
 * </ul>
 * Needs a signed-in backend user (or an API token), like the rest of dotCMS's REST API.
 */
@Path("/v1/tsd/accessibility")
public class AccessibilityResource {

    private final WebResource webResource = new WebResource();

    @GET
    @Path("/content/{identifier}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response content(@Context HttpServletRequest request, @Context HttpServletResponse response,
                            @PathParam("identifier") String identifier,
                            @DefaultValue("1") @QueryParam("language") long language) {
        User user = user(request, response);
        try {
            Contentlet content = APILocator.getContentletAPI()
                    .findContentletByIdentifier(identifier, false, language, user, false);
            return Response.ok(new ResponseEntityView<>(AccessibilityRules.check(content).toMap())).build();
        } catch (Exception | LinkageError e) {
            return failure(e);
        }
    }

    @GET
    @Path("/page")
    @Produces(MediaType.APPLICATION_JSON)
    public Response page(@Context HttpServletRequest request, @Context HttpServletResponse response,
                         @QueryParam("site") String siteId, @QueryParam("path") String path,
                         @DefaultValue("1") @QueryParam("language") long language,
                         @DefaultValue("Tsd") @QueryParam("prefix") String prefix) {
        User user = user(request, response);
        try {
            return pageReport(user, siteId, path, language, prefix);
        } catch (Exception | LinkageError e) {
            return failure(e);
        }
    }

    private Response pageReport(User user, String siteId, String path, long language, String prefix)
            throws Exception {
        Host site = APILocator.getHostAPI().find(siteId, user, false);
        // "/news/news-detail" is a page; "/outreach" is a folder whose page is /outreach/index.
        String requested = path == null || path.isBlank() ? "/" : path.trim();
        IHTMLPage page = requested.endsWith("/") ? null
                : APILocator.getHTMLPageAssetAPI().getPageByPath(requested, site, language, false);
        if (page == null) {
            page = APILocator.getHTMLPageAssetAPI().getPageByPath(folderIndex(requested), site, language, false);
        }
        if (page == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        // The sections in page order: container slot, then position in the slot.
        List<MultiTree> placed = new ArrayList<>(APILocator.getMultiTreeAPI().getMultiTrees(page.getIdentifier()));
        placed.sort(Comparator.comparingInt((MultiTree t) -> slot(t.getRelationType()))
                .thenComparingInt(MultiTree::getTreeOrder));
        Set<String> identifiers = new LinkedHashSet<>();
        placed.forEach(t -> identifiers.add(t.getContentlet()));

        List<Map<String, Object>> reports = new ArrayList<>();
        int errors = 0;
        for (String identifier : identifiers) {
            Contentlet content = APILocator.getContentletAPI()
                    .findContentletByIdentifier(identifier, false, language, user, false);
            if (content != null && content.getContentType().variable().startsWith(prefix)) {
                Report report = AccessibilityRules.check(content);
                errors += report.errors().size();
                reports.add(report.toMap());
            }
        }
        return Response.ok(new ResponseEntityView<>(Map.of(
                "page", page.getURI(), "errors", errors, "sections", reports))).build();
    }

    /** The error as JSON, so tools see what went wrong (and it's in the dotCMS log). */
    private Response failure(Throwable e) {
        Logger.error(this, "Accessibility report failed: " + e.getMessage(), e);
        return Response.serverError()
                .entity(Map.of("error", e.getClass().getSimpleName() + ": " + String.valueOf(e.getMessage())))
                .type(MediaType.APPLICATION_JSON).build();
    }

    private User user(HttpServletRequest request, HttpServletResponse response) {
        return new WebResource.InitBuilder(webResource)
                .requestAndResponse(request, response)
                .requiredBackendUser(true)
                .rejectWhenNoUser(true)
                .init()
                .getUser();
    }

    /** "/" → "/index", "/outreach" → "/outreach/index". */
    static String folderIndex(String path) {
        return path.endsWith("/") ? path + "index" : path + "/index";
    }

    private static int slot(String uuid) {
        try {
            return Integer.parseInt(uuid.replace("uuid-", ""));
        } catch (NumberFormatException e) {
            return Integer.MAX_VALUE;
        }
    }
}
