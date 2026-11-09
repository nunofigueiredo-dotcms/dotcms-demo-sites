// Roles (under one parent role), their backend tools and site permissions,
// and one demo user per role. Passwords come from DEMO_USER_PASSWORD.
import {
  api, must, record, step, log, siteId, allRoles, allUsers, demoPassword, DRY,
} from "./lib/api.mjs";

export const PARENT_ROLE = { roleName: "Publishing Demo", roleKey: "pdRoot", description: "Roles for the publishing-demo site" };

export const ROLES = {
  marketer: { roleName: "Content Marketer", roleKey: "pdContentMarketer", description: "Writes content and submits it for review." },
  regional: { roleName: "Regional Marketer", roleKey: "pdRegionalMarketer", description: "Localises approved messaging for a region and submits it for review." },
  sme: { roleName: "SME Reviewer", roleKey: "pdSmeReviewer", description: "Subject-matter expert: checks claims and proof points." },
  owner: { roleName: "Messaging Owner", roleKey: "pdMessagingOwner", description: "A&G content team. Final approver of all messaging." },
  reader: { roleName: "Hub Reader", roleKey: "pdHubReader", description: "Field teams: read-only access to the Messaging Hub." },
};

// Fictional people, clearly not real Elsevier staff.
export const USERS = [
  { role: "marketer", email: "hannah.clarke@publishing-demo.example", firstName: "Hannah", lastName: "Clarke", title: "Content Marketer, A&G" },
  { role: "regional", email: "lukas.brandt@publishing-demo.example", firstName: "Lukas", lastName: "Brandt", title: "Regional Marketer, DACH & Iberia" },
  { role: "sme", email: "priya.raman@publishing-demo.example", firstName: "Priya", lastName: "Raman", title: "Research Integrity SME" },
  { role: "owner", email: "eleanor.shaw@publishing-demo.example", firstName: "Eleanor", lastName: "Shaw", title: "Messaging Owner, A&G Content" },
  { role: "reader", email: "marco.silva@publishing-demo.example", firstName: "Marco", lastName: "Silva", title: "Account Manager, Field Sales" },
];

// The frontend's server-side reader. API tokens only work for back-end users, so the
// hub reads with this account (Hub Reader role, no backend tools) rather than Marco's.
export const SERVICE_USER = { role: "reader", email: "hub-service@publishing-demo.example", firstName: "Hub", lastName: "Service (read-only)", title: "Frontend service account", service: true };

const BACKEND_TOOLS = ["Site", "Content", "Digital Assets"];
const R = ["READ"];
const RW = ["READ", "WRITE"];
const PERMISSIONS = {
  // STRUCTURE WRITE is what lets a role create items of the site's types on this
  // version. None of these roles has the Content Model tool, so they can't change
  // the types themselves.
  marketer: { INDIVIDUAL: ["READ", "CAN_ADD_CHILDREN"], FOLDER: ["READ", "CAN_ADD_CHILDREN"], CONTENT: RW, PAGE: RW, TEMPLATE: R, TEMPLATE_LAYOUT: R, CONTAINER: R, STRUCTURE: RW },
  regional: { INDIVIDUAL: ["READ", "CAN_ADD_CHILDREN"], FOLDER: ["READ", "CAN_ADD_CHILDREN"], CONTENT: RW, PAGE: R, TEMPLATE: R, TEMPLATE_LAYOUT: R, CONTAINER: R, STRUCTURE: RW },
  sme: { INDIVIDUAL: R, FOLDER: R, CONTENT: RW, PAGE: R, TEMPLATE: R, TEMPLATE_LAYOUT: R, CONTAINER: R, STRUCTURE: R },
  owner: { INDIVIDUAL: ["READ", "CAN_ADD_CHILDREN"], FOLDER: ["READ", "WRITE", "PUBLISH", "CAN_ADD_CHILDREN"], CONTENT: ["READ", "WRITE", "PUBLISH"], PAGE: ["READ", "WRITE", "PUBLISH"], TEMPLATE: R, TEMPLATE_LAYOUT: R, CONTAINER: R, STRUCTURE: RW },
  reader: { INDIVIDUAL: R, FOLDER: R, CONTENT: R, PAGE: R, TEMPLATE: R, TEMPLATE_LAYOUT: R, CONTAINER: R, STRUCTURE: R },
};

async function ensureRole(form, parentRoleId) {
  const existing = (await allRoles()).find((r) => r.roleKey === form.roleKey);
  const body = { ...form, canEditUsers: true, canEditPermissions: true, canEditLayouts: true };
  if (parentRoleId) body.parentRoleId = parentRoleId;
  if (existing) {
    log(`  role ${form.roleName} exists -> ${existing.id}`);
    return existing.id;
  }
  const e = must(await api("POST", "/api/v1/roles", body), `role ${form.roleKey}`);
  record("role", form.roleKey, e.id);
  log(`  role ${form.roleName} created -> ${e.id}`);
  return e.id;
}

export async function roleIds() {
  const roles = await allRoles();
  return Object.fromEntries(Object.entries(ROLES).map(([k, f]) => [k, roles.find((r) => r.roleKey === f.roleKey)?.id || `dry-role-${k}`]));
}

export async function run() {
  const site = await siteId();
  const ids = {};
  await step("Roles", async () => {
    const parent = await ensureRole(PARENT_ROLE, null);
    for (const [k, form] of Object.entries(ROLES)) ids[k] = await ensureRole(form, DRY ? undefined : parent);
  });

  await step("Backend tools", async () => {
    const menu = (await api("GET", "/api/v1/menu")).entity || [];
    const layoutIds = menu.filter((l) => BACKEND_TOOLS.includes(l.tabName || l.name)).map((l) => l.id);
    for (const k of ["marketer", "regional", "sme", "owner"]) {
      const have = ((await api("GET", `/api/v1/roles/${ids[k]}/layouts`)).entity || []).map((l) => l.id || l);
      if (layoutIds.every((id) => have.includes(id))) continue;
      must(await api("POST", "/api/v1/roles/layouts", { roleId: ids[k], layoutIds }), `layouts ${k}`, {});
    }
    log(`  ${BACKEND_TOOLS.join(", ")} for all roles except Hub Reader (hub only)`);
  });

  await step("Permissions on the site", async () => {
    for (const [k, perms] of Object.entries(PERMISSIONS)) {
      must(
        await api("PUT", `/api/v1/permissions/role/${ids[k]}/asset/${site}?cascade=true`, { permissions: perms }),
        `permissions ${k}`,
        {},
      );
    }
    // Categories (the topic tree) inherit from the System Host: without READ there,
    // users can't put content in a topic. Not cascaded: it only adds category read
    // access, and it disappears with the roles on teardown.
    for (const id of Object.values(ids)) {
      must(
        await api("PUT", `/api/v1/permissions/role/${id}/asset/SYSTEM_HOST?cascade=false`, { permissions: { CATEGORY: ["READ"] } }),
        "category read",
        {},
      );
    }
    await api("DELETE", "/api/v1/caches/region/Permission");
    log("  marketer/regional edit, SME edit (review), owner edit+publish, reader read-only; all can read topics");
  });

  await step("Users", async () => {
    const password = demoPassword();
    const backend = (await allRoles()).find((r) => r.roleKey === "DOTCMS_BACK_END_USER")?.id;
    const frontend = (await allRoles()).find((r) => r.roleKey === "DOTCMS_FRONT_END_USER")?.id;
    const users = await allUsers();
    for (const u of [...USERS, SERVICE_USER]) {
      let userId = users.find((x) => x.emailAddress === u.email)?.userId;
      if (userId) log(`  user ${u.email} exists -> ${userId}`);
      else {
        const e = must(
          await api("POST", "/api/v1/users", {
            firstName: u.firstName, lastName: u.lastName, email: u.email,
            password: [...password], active: true, languageId: "en_US", roles: [ids[u.role]],
          }),
          `user ${u.email}`,
        );
        userId = e.userID || e.userId;
        record("user", u.email, userId);
        log(`  user ${u.email} created -> ${userId}`);
      }
      if (DRY) continue;
      await api("POST", `/api/v1/roles/${ids[u.role]}/users/${userId}`);
      // Hub Reader signs in to the hub only; everyone else also uses the dotCMS backend.
      const loginRole = u.role === "reader" && !u.service ? frontend : backend;
      if (loginRole) await api("POST", `/api/v1/roles/${loginRole}/users/${userId}`);
    }
    log("  password: DEMO_USER_PASSWORD (env or publishing-demo/.env.local)");
  });
  return ids;
}

if (import.meta.url === `file://${process.argv[1]}`) await run();
