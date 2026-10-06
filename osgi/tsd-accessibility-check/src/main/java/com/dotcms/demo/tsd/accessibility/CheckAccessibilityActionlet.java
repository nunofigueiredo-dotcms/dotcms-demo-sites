package com.dotcms.demo.tsd.accessibility;

import com.dotmarketing.portlets.contentlet.model.Contentlet;
import com.dotmarketing.portlets.workflows.actionlet.WorkFlowActionlet;
import com.dotmarketing.portlets.workflows.model.WorkflowActionClassParameter;
import com.dotmarketing.portlets.workflows.model.WorkflowActionFailureException;
import com.dotmarketing.portlets.workflows.model.WorkflowActionletParameter;
import com.dotmarketing.portlets.workflows.model.WorkflowProcessor;
import com.dotmarketing.util.Logger;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Workflow step "Check accessibility".
 *
 * <p>Added first to an action (Submit for review, Approve &amp; publish, Publish), it checks
 * the content against {@link AccessibilityRules}. When there are errors the action stops,
 * nothing is saved, and the editor sees each problem and how to fix it. Warnings don't
 * stop the action. Content types outside the configured prefix pass straight through.
 */
public class CheckAccessibilityActionlet extends WorkFlowActionlet {

    private static final long serialVersionUID = 1L;

    static final String TYPE_PREFIX = "contentTypePrefix";

    @Override
    public String getName() {
        return "Check accessibility";
    }

    @Override
    public String getHowTo() {
        return "Stops the action while the content has accessibility errors: images without a "
                + "description, vague or empty link text, or headings out of order. Put it first "
                + "on the action, so nothing is saved when the check fails.";
    }

    @Override
    public List<WorkflowActionletParameter> getParameters() {
        return List.of(new WorkflowActionletParameter(TYPE_PREFIX,
                "Check content types whose variable starts with", "Tsd", true));
    }

    @Override
    public void executeAction(WorkflowProcessor processor, Map<String, WorkflowActionClassParameter> params)
            throws WorkflowActionFailureException {
        Contentlet content = processor.getContentlet();
        String prefix = value(params, TYPE_PREFIX, "Tsd");
        if (content == null || !content.getContentType().variable().startsWith(prefix)) {
            return;
        }

        Report report = AccessibilityRules.check(content);
        if (report.passes()) {
            Logger.info(this, "Accessibility check: \"" + content.getTitle() + "\" passed ("
                    + report.warnings().size() + " warnings)");
            return;
        }

        String problems = report.errors().stream()
                .map(issue -> "• " + issue.field() + ": " + issue.message())
                .collect(Collectors.joining("\n"));
        String message = "Accessibility check: fix " + report.errors().size()
                + (report.errors().size() == 1 ? " problem" : " problems") + " in \"" + content.getTitle()
                + "\" first.\n" + problems;
        Logger.warn(this, message);
        processor.abortProcessor();
        throw new WorkflowActionFailureException(message);
    }

    private static String value(Map<String, WorkflowActionClassParameter> params, String key, String fallback) {
        WorkflowActionClassParameter param = params == null ? null : params.get(key);
        String value = param == null ? null : param.getValue();
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
