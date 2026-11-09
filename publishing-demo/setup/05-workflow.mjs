// Workflow "Governed Content".
//
//   Draft ─Submit for SME Review─▶ SME Review ─SME Approve─▶ Messaging Owner Approval ─Approve─▶ Approved
//     └──────Submit for Approval──────────────────────────────▶            │
//   ◀──────────────── Reject (comment required) ─────────────────────────────┘
//   Approved ─Publish to Web──────────────▶ Published to Web
//   Approved ─Ready for External Channel─▶ Ready for External Channel   (publishing happens in Sprinklr)
//   Save Draft on Approved / Published / Ready → back to Draft (a new governed cycle)
//
// dotCMS 26.11 action "conditions" don't hide actions, so routing is enforced by
// guard steps (Velocity) that stop the action with a message when the route is wrong:
// an item marked "SME needed" can't skip SME review, an item for LinkedIn or social
// can't be published to the web, and Reject needs a comment.
import { api, must, record, step, log, allRoles, DRY } from "./lib/api.mjs";
import { roleIds } from "./04-roles-users.mjs";

export const SCHEME = "Governed Content";
export const STEPS = [
  "Draft",
  "SME Review",
  "Messaging Owner Approval",
  "Approved",
  "Published to Web",
  "Ready for External Channel",
];
const RESOLVED = ["Published to Web", "Ready for External Channel"];
const SHOW_ALL = ["NEW", "EDITING", "LOCKED", "UNLOCKED", "PUBLISHED", "UNPUBLISHED", "LISTING"];
const A = "com.dotmarketing.portlets.workflows.actionlet.";
const VTL = A + "VelocityScriptActionlet";

export const SPRINKLR_NOTE =
  "Approved for an external channel. Final publishing happens in Sprinklr: dotCMS holds the approved " +
  "source, the version and the audit trail. Hand-off file: channels/out/sprinklr-handoff.json.";

// ---- Guards ------------------------------------------------------------------
// A guard is two steps. Velocity can read the item and the comment, so it decides
// and leaves its verdict in the cache; JavaScript can't read the item on this
// version, but it can stop the action with a message the user sees (the step
// doesn't change). Nothing is saved if a guard stops the action.
const GUARD_KEY = "publishing-demo-guard";
const stop = (msg) => `#set($verdict = "${msg}")`;
const verdict = (body) => `#set($verdict = "ok")
${body}
#set($ok = $dotcache.put("${GUARD_KEY}", $verdict, 60))`;
// It must return a string: a script that ends without a value fails the action (HTTP 500).
const GATE_JS = `// Stop the action if the Velocity guard before this step said so.
(function () {
  var verdict = dotcache.get("${GUARD_KEY}");
  dotcache.remove("${GUARD_KEY}");
  if (verdict && String(verdict) !== "ok") { throw new Error(String(verdict)); }
  return "ok";
})();`;

const channelKind = `
#set($type = $contentlet.getContentType().variable())
#set($external = false)
#if($type == "PdLocalisedMessage")
  #set($ch = "$!contentlet.getStringProperty('targetChannel')")
  #if($ch == "linkedin-newsletter" || $ch == "paid-social" || $ch == "organic-social")#set($external = true)#end
#elseif($type == "PdNewsletterIssue")
  #if("$!contentlet.getStringProperty('channel')" == "linkedin")#set($external = true)#end
#end`;

const GUARD_BODIES = {
  comment: `## Reject needs a comment
#set($msg = "$!workflow.getWorkflowMessage()")
#if($msg.trim().length() == 0)${stop("A comment is required to reject. Say what needs to change.")}#end`,
  smeRequired: `## Only items marked "SME needed" go to SME review
#if("$!contentlet.getStringProperty('smeNeeded')" != "yes")${stop("SME review is not needed for this item. Use Submit for Approval.")}#end`,
  smeNotRequired: `## Items marked "SME needed" can't skip SME review
#if("$!contentlet.getStringProperty('smeNeeded')" == "yes")${stop("This item needs SME review first. Use Submit for SME Review.")}#end`,
  web: `## Publish to Web is for on-site channels only
${channelKind}
#if($external)${stop("This item is for LinkedIn or social. Use Ready for External Channel: it is published in Sprinklr.")}#end`,
  external: `## Ready for External Channel is for LinkedIn and social only
${channelKind}
#if(!$external)${stop("This item is for an on-site channel. Use Publish to Web.")}#end`,
};
export const GUARDS = Object.fromEntries(Object.entries(GUARD_BODIES).map(([k, v]) => [k, verdict(v)]));

// Newsletter issues show their approval status as a field too.
const stamp = (status) => `## Keep the newsletter's approval status in step with the workflow
#if($contentlet.getContentType().variable() == "PdNewsletterIssue")
#set($ok = $contentlet.setStringProperty("approvalStatus", "${status}"))
#end`;

const vtl = (script, key) => ({ clazz: VTL, parameters: { script, resultKey: key } });
const JS = "com.dotcms.rendering.js.JsScriptActionlet";
const guard = (name) => [vtl(GUARDS[name], "guard"), { clazz: JS, parameters: { javascriptCode: GATE_JS, resultKey: "gate" } }];
const plain = (name, parameters = {}) => ({ clazz: A + name, parameters });
const SAVE = plain("SaveContentActionlet");
const UNLOCK = plain("CheckinContentActionlet");
const PUBLISH = plain("PublishContentActionlet");

async function ensureScheme() {
  const schemes = (await api("GET", "/api/v1/workflow/schemes")).entity || [];
  const found = schemes.find((s) => s.name === SCHEME && !s.archived);
  if (found) {
    log(`  scheme exists -> ${found.id}`);
    return found.id;
  }
  const e = must(
    await api("POST", "/api/v1/workflow/schemes", {
      schemeName: SCHEME,
      schemeDescription:
        "Publishing demo: author → (SME review) → Messaging Owner approval → publish to web, or hand off to Sprinklr for LinkedIn and social.",
      schemeArchived: false,
    }),
    "workflow scheme",
  );
  record("workflow", SCHEME, e.id);
  log(`  scheme created -> ${e.id}`);
  return e.id;
}

export async function run() {
  const roles = await roleIds();
  const all = await allRoles();
  // Administrators can fire any action; the parent role has no users, so this
  // keeps "Remove (admin)" out of every demo user's menu.
  const admin = all.find((r) => r.roleKey === "pdRoot")?.id || "dry-role-root";
  const nobody = all.find((r) => r.roleKey === "CMS Anonymous")?.id;
  const contentOwner = all.find((r) => r.roleKey === "CMS Owner")?.id;
  let scheme;
  const steps = {};
  const actions = {};

  await step(`Workflow "${SCHEME}"`, async () => {
    scheme = await ensureScheme();
    const have = Object.fromEntries(
      ((await api("GET", `/api/v1/workflow/schemes/${scheme}/steps`)).entity || []).map((s) => [s.name, s.id]),
    );
    for (const name of STEPS) {
      if (have[name]) steps[name] = have[name];
      else {
        const e = must(
          await api("POST", "/api/v1/workflow/steps", {
            schemeId: scheme, stepName: name, stepResolved: RESOLVED.includes(name),
            enableEscalation: false, escalationAction: "", escalationTime: "0",
          }),
          `step ${name}`,
        );
        steps[name] = e.id;
        log(`  step ${name}`);
      }
    }
    // Keep the steps in the documented order.
    if (!DRY) for (const [i, name] of STEPS.entries()) await api("PUT", `/api/v1/workflow/reorder/step/${steps[name]}/order/${i}`);
  });

  const { marketer, regional, sme, owner } = roles;
  const ACTIONS = [
    { name: "Save Draft", on: ["Draft", "Approved", "Published to Web", "Ready for External Channel"], next: "Draft",
      who: [marketer, regional, owner], icon: "saveIcon", assign: nobody,
      steps: [vtl(stamp("draft"), "stamp"), SAVE, UNLOCK] },
    { name: "Submit for SME Review", on: ["Draft"], next: "SME Review", who: [marketer, regional], icon: "shareIcon",
      comment: true, assign: sme, steps: [...guard("smeRequired"), vtl(stamp("in-review"), "stamp"), SAVE, UNLOCK] },
    { name: "Submit for Approval", on: ["Draft"], next: "Messaging Owner Approval", who: [marketer, regional], icon: "shareIcon",
      comment: true, assign: owner, steps: [...guard("smeNotRequired"), vtl(stamp("in-review"), "stamp"), SAVE, UNLOCK] },
    { name: "SME Approve", on: ["SME Review"], next: "Messaging Owner Approval", who: [sme], icon: "workflowIcon",
      comment: true, assign: owner, steps: [UNLOCK] },
    { name: "Approve", on: ["Messaging Owner Approval"], next: "Approved", who: [owner], icon: "workflowIcon",
      comment: true, assign: owner, steps: [vtl(stamp("approved"), "stamp"), SAVE, UNLOCK] },
    { name: "Reject", on: ["SME Review", "Messaging Owner Approval"], next: "Draft", who: [sme, owner], icon: "cancelIcon",
      comment: true, assign: contentOwner, steps: [...guard("comment"), vtl(stamp("rejected"), "stamp"), SAVE, UNLOCK] },
    { name: "Publish to Web", on: ["Approved"], next: "Published to Web", who: [owner], icon: "publishIcon",
      assign: nobody, steps: [...guard("web"), vtl(stamp("published"), "stamp"), SAVE, PUBLISH, UNLOCK] },
    { name: "Ready for External Channel", on: ["Approved"], next: "Ready for External Channel", who: [owner], icon: "pushPublishIcon",
      comment: true, assign: nobody,
      steps: [...guard("external"), vtl(stamp("ready-external"), "stamp"), SAVE, PUBLISH,
        plain("CommentOnWorkflowActionlet", { comment: SPRINKLR_NOTE }), UNLOCK] },
    // Administrators only: used by teardown and for clean-up. Hidden from the demo users.
    { name: "Remove (admin)", on: STEPS, next: "Draft", who: [admin], icon: "deleteIcon", assign: nobody,
      steps: [plain("UnpublishContentActionlet"), plain("ArchiveContentActionlet"), plain("DeleteContentActionlet")] },
  ];

  await step("Actions", async () => {
    const existing = Object.fromEntries(
      ((await api("GET", `/api/v1/workflow/schemes/${scheme}/actions`)).entity || []).map((a) => [a.name, a]),
    );
    for (const a of ACTIONS) {
      const form = {
        schemeId: scheme, stepId: steps[a.on[0]], actionName: a.name, whoCanUse: a.who, actionIcon: a.icon,
        actionAssignable: false, actionCommentable: !!a.comment, actionRoleHierarchyForAssign: false,
        showOn: SHOW_ALL, actionNextStep: steps[a.next], actionNextAssign: a.assign, actionCondition: "",
      };
      let id = existing[a.name]?.id;
      if (id) {
        must(await api("PUT", `/api/v1/workflow/actions/${id}`, { ...form, actionId: id }), `update ${a.name}`, {});
      } else {
        id = must(await api("POST", "/api/v1/workflow/actions", form), `action ${a.name}`).id;
        log(`  action ${a.name} created`);
      }
      actions[a.name] = id;
      // Attach to every step it belongs on.
      for (const s of a.on) {
        const on = ((await api("GET", `/api/v1/workflow/steps/${steps[s]}/actions`)).entity || []).map((x) => x.id);
        if (!on.includes(id)) await api("POST", `/api/v1/workflow/steps/${steps[s]}/actions`, { actionId: id });
      }
      await setActionlets(id, a.name, a.steps);
    }
    log(`  ${ACTIONS.length} actions in place`);
  });

  await step("Default (system) actions", async () => {
    const map = [["NEW", "Save Draft"], ["EDIT", "Save Draft"], ["PUBLISH", "Publish to Web"],
      ["UNPUBLISH", "Remove (admin)"], ["ARCHIVE", "Remove (admin)"], ["DELETE", "Remove (admin)"], ["DESTROY", "Remove (admin)"]];
    const current = (await api("GET", `/api/v1/workflow/schemes/${scheme}/system/actions`)).entity || [];
    for (const [sys, name] of map) {
      const have = current.find((c) => c.systemAction === sys);
      if (have?.workflowAction?.id === actions[name]) continue;
      await api("PUT", "/api/v1/workflow/system/actions", { actionId: actions[name], schemeId: scheme, systemAction: sys });
    }
    log("  NEW/EDIT → Save Draft, PUBLISH → Publish to Web, UNPUBLISH/ARCHIVE/DELETE → Remove (admin)");
  });
  return { scheme, steps, actions };
}

/** Make an action's steps exactly `wanted`, in order (dotCMS doesn't always keep order). */
async function setActionlets(actionId, name, wanted) {
  if (DRY) return;
  const sig = (list) => list.map((x) => `${x.clazz}|${JSON.stringify(x.parameters || {})}`).join("\n");
  const read = async () =>
    ((await api("GET", `/api/v1/workflow/actions/${actionId}/actionlets`)).entity || []).map((s) => ({
      id: s.id,
      clazz: s.actionlet?.actionClass,
      parameters: Object.fromEntries(
        Object.entries(s.parameters || {}).map(([k, v]) => [k, typeof v === "object" && v ? v.value : v]),
      ),
    }));
  const want = wanted.map((w) => ({ clazz: w.clazz, parameters: w.parameters }));
  for (let attempt = 0; attempt < 3; attempt++) {
    const got = await read();
    const gotSig = sig(got.map((g) => ({ clazz: g.clazz, parameters: Object.keys(g.parameters).length ? g.parameters : {} })));
    if (gotSig === sig(want) || (attempt > 0 && got.map((g) => g.clazz).join() === want.map((w) => w.clazz).join())) return;
    for (const s of got) await api("DELETE", `/api/v1/workflow/actionlets/${s.id}`);
    for (const [order, w] of want.entries()) {
      const r = await api("POST", `/api/v1/workflow/actions/${actionId}/actionlets`, {
        actionletClass: w.clazz, order, parameters: w.parameters,
      });
      if (r?._status >= 400) {
        console.error(`  ! ${name}: ${w.clazz}: ${JSON.stringify(r).slice(0, 300)}`);
        process.exit(1);
      }
    }
  }
  const final = (await read()).map((g) => g.clazz.split(".").pop());
  if (final.join() !== want.map((w) => w.clazz.split(".").pop()).join()) {
    console.error(`  ! ${name}: steps out of order ${final}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await run();
