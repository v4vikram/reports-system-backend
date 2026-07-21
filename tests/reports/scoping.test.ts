import { beforeEach, describe, expect, it } from "vitest";
import { authed, createUserAndLogin } from "../helpers/fixtures.js";

interface Fixture {
  adminToken: string;
  empA: { id: string; token: string };
  empB: { id: string; token: string };
  portalClient: { id: string; token: string };
  client: { id: string };
  otherClient: { id: string };
  category: { id: string };
  event: { id: string };
  otherClientEvent: { id: string };
  reportAssignedToA: { id: string };
  reportAssignedToB: { id: string };
}

async function buildFixture(): Promise<Fixture> {
  const { token: adminToken } = await createUserAndLogin({ email: "admin@test.local", roleNames: ["ADMIN"] });

  const { user: empAUser, token: empAToken } = await createUserAndLogin({
    email: "emp-a@test.local",
    roleNames: ["EMPLOYEE"],
    permissionKeys: ["clients:read", "reports:read", "reports:create"],
  });
  const { user: empBUser, token: empBToken } = await createUserAndLogin({
    email: "emp-b@test.local",
    roleNames: ["EMPLOYEE"],
    permissionKeys: ["clients:read", "clients:read-all", "reports:read", "reports:read-all"],
  });
  const { user: portalUser, token: portalToken } = await createUserAndLogin({
    email: "portal-client@test.local",
    roleNames: ["CLIENT"],
    permissionKeys: ["clients:read", "reports:read"],
  });

  const clientRes = await authed(adminToken).post("/api/clients", {
    name: "Acme",
    company: null,
    email: null,
    phone: null,
    address: null,
    notes: null,
    assignedUserId: empAUser.id,
    portalUserId: portalUser.id,
  });
  const client = clientRes.body.data;

  const otherClientRes = await authed(adminToken).post("/api/clients", {
    name: "Other Co",
    company: null,
    email: null,
    phone: null,
    address: null,
    notes: null,
    assignedUserId: empBUser.id,
    portalUserId: null,
  });
  const otherClient = otherClientRes.body.data;

  const categoryRes = await authed(adminToken).post("/api/categories", {
    name: "Press",
    parentId: null,
    description: null,
  });
  const category = categoryRes.body.data;

  const eventRes = await authed(adminToken).post("/api/events", {
    clientId: client.id,
    title: "Kickoff",
    description: null,
    eventDate: null,
  });
  const event = eventRes.body.data;

  const otherClientEventRes = await authed(adminToken).post("/api/events", {
    clientId: otherClient.id,
    title: "Other kickoff",
    description: null,
    eventDate: null,
  });
  const otherClientEvent = otherClientEventRes.body.data;

  const reportARes = await authed(adminToken).post("/api/reports", {
    eventId: event.id,
    categoryId: category.id,
    title: "Report assigned to A",
    content: null,
    assigneeUserIds: [empAUser.id],
  });
  const reportAssignedToA = reportARes.body.data;

  const reportBRes = await authed(adminToken).post("/api/reports", {
    eventId: event.id,
    categoryId: category.id,
    title: "Report assigned to B",
    content: null,
    assigneeUserIds: [empBUser.id],
  });
  const reportAssignedToB = reportBRes.body.data;

  return {
    adminToken,
    empA: { id: empAUser.id, token: empAToken },
    empB: { id: empBUser.id, token: empBToken },
    portalClient: { id: portalUser.id, token: portalToken },
    client,
    otherClient,
    category,
    event,
    otherClientEvent,
    reportAssignedToA,
    reportAssignedToB,
  };
}

describe("report visibility — three-tier scoping", () => {
  let fx: Fixture;

  beforeEach(async () => {
    fx = await buildFixture();
  });

  it("admin sees every report", async () => {
    const res = await authed(fx.adminToken).get("/api/reports");
    const ids = res.body.data.map((r: { id: string }) => r.id);
    expect(ids).toEqual(expect.arrayContaining([fx.reportAssignedToA.id, fx.reportAssignedToB.id]));
  });

  it("an employee with bare reports:read sees only reports they're assigned to", async () => {
    const res = await authed(fx.empA.token).get("/api/reports");
    const ids = res.body.data.map((r: { id: string }) => r.id);
    expect(ids).toEqual([fx.reportAssignedToA.id]);
    expect(ids).not.toContain(fx.reportAssignedToB.id);
  });

  it("an employee with reports:read-all sees every report", async () => {
    const res = await authed(fx.empB.token).get("/api/reports");
    const ids = res.body.data.map((r: { id: string }) => r.id);
    expect(ids).toEqual(expect.arrayContaining([fx.reportAssignedToA.id, fx.reportAssignedToB.id]));
  });

  it("a portal-linked client sees both of their own client's reports (own-client ceiling, not assignee-scoped)", async () => {
    const res = await authed(fx.portalClient.token).get("/api/reports");
    const ids = res.body.data.map((r: { id: string; clientId: string }) => r.id);
    expect(ids.sort()).toEqual([fx.reportAssignedToA.id, fx.reportAssignedToB.id].sort());
    expect(res.body.data.every((r: { clientId: string }) => r.clientId === fx.client.id)).toBe(true);
  });

  it("the portal ceiling still caps visibility even if the portal user is also granted reports:read-all", async () => {
    // The exact "admin fat-fingers a broader grant onto a portal login"
    // scenario the ceiling exists to guard against.
    const permsRes = await authed(fx.adminToken).get("/api/permissions");
    const readAllId = permsRes.body.data.find((p: { key: string }) => p.key === "reports:read-all").id;
    const readId = permsRes.body.data.find((p: { key: string }) => p.key === "reports:read").id;
    await authed(fx.adminToken).put(`/api/users/${fx.portalClient.id}/permissions`, {
      permissionIds: [readId, readAllId],
    });

    const res = await authed(fx.portalClient.token).get("/api/reports");
    expect(res.body.data.every((r: { clientId: string }) => r.clientId === fx.client.id)).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });

  it("blocks (404) a scoped actor fetching a report outside their assignment", async () => {
    const res = await authed(fx.empA.token).get(`/api/reports/${fx.reportAssignedToB.id}`);
    expect(res.status).toBe(404);
  });

  it("blocks a scoped actor from creating a report against a client outside their own scope", async () => {
    const res = await authed(fx.empA.token).post("/api/reports", {
      eventId: fx.otherClientEvent.id,
      categoryId: fx.category.id,
      title: "Should be blocked",
      content: null,
      assigneeUserIds: [],
    });
    expect(res.status).toBe(404);
  });

  it("a portal-linked client is blocked (404) from another client's detail page", async () => {
    const res = await authed(fx.portalClient.token).get(`/api/clients/${fx.otherClient.id}`);
    expect(res.status).toBe(404);
  });
});
