import { beforeEach, describe, expect, it } from "vitest";
import { authed, createUserAndLogin } from "../helpers/fixtures.js";

async function makeClient(adminToken: string, name: string, assignedUserId: string | null, portalUserId: string | null = null) {
  const res = await authed(adminToken).post("/api/clients", {
    name,
    company: null,
    email: null,
    phone: null,
    address: null,
    notes: null,
    assignedUserId,
    portalUserId,
  });
  expect(res.status).toBe(201);
  return res.body.data;
}

describe("client visibility scoping", () => {
  let adminToken: string;

  beforeEach(async () => {
    ({ token: adminToken } = await createUserAndLogin({ email: "admin@test.local", roleNames: ["ADMIN"] }));
  });

  it("admin sees every client regardless of assignment", async () => {
    const { user: empA } = await createUserAndLogin({ email: "emp-a@test.local", roleNames: ["EMPLOYEE"] });
    const { user: empB } = await createUserAndLogin({ email: "emp-b@test.local", roleNames: ["EMPLOYEE"] });
    const clientA = await makeClient(adminToken, "Client A", empA.id);
    const clientB = await makeClient(adminToken, "Client B", empB.id);

    const res = await authed(adminToken).get("/api/clients");
    const ids = res.body.data.map((c: { id: string }) => c.id);
    expect(ids).toEqual(expect.arrayContaining([clientA.id, clientB.id]));
  });

  it("an employee with bare clients:read sees only their assigned client", async () => {
    const { user: empA, token: empAToken } = await createUserAndLogin({
      email: "emp-a@test.local",
      roleNames: ["EMPLOYEE"],
      permissionKeys: ["clients:read"],
    });
    const { user: empB } = await createUserAndLogin({ email: "emp-b@test.local", roleNames: ["EMPLOYEE"] });
    const clientA = await makeClient(adminToken, "Client A", empA.id);
    const clientB = await makeClient(adminToken, "Client B", empB.id);

    const res = await authed(empAToken).get("/api/clients");
    const ids = res.body.data.map((c: { id: string }) => c.id);
    expect(ids).toEqual([clientA.id]);
    expect(ids).not.toContain(clientB.id);
  });

  it("an employee with clients:read-all sees every client", async () => {
    const { user: empA } = await createUserAndLogin({ email: "emp-a@test.local", roleNames: ["EMPLOYEE"] });
    const { token: empBToken } = await createUserAndLogin({
      email: "emp-b@test.local",
      roleNames: ["EMPLOYEE"],
      permissionKeys: ["clients:read", "clients:read-all"],
    });
    const clientA = await makeClient(adminToken, "Client A", empA.id);

    const res = await authed(empBToken).get("/api/clients");
    const ids = res.body.data.map((c: { id: string }) => c.id);
    expect(ids).toContain(clientA.id);
  });

  it("a portal-linked CLIENT user sees only the client they're linked to", async () => {
    const { user: portalUser, token: portalToken } = await createUserAndLogin({
      email: "portal-user@test.local",
      roleNames: ["CLIENT"],
      permissionKeys: ["clients:read"],
    });
    const { user: empB } = await createUserAndLogin({ email: "emp-b@test.local", roleNames: ["EMPLOYEE"] });
    const linkedClient = await makeClient(adminToken, "Linked Client", null, portalUser.id);
    const otherClient = await makeClient(adminToken, "Other Client", empB.id);

    const res = await authed(portalToken).get("/api/clients");
    const ids = res.body.data.map((c: { id: string }) => c.id);
    expect(ids).toEqual([linkedClient.id]);
    expect(ids).not.toContain(otherClient.id);
  });

  it("returns 404 (not 403) for a scoped actor fetching a client outside their scope", async () => {
    const { token: empAToken } = await createUserAndLogin({
      email: "emp-a@test.local",
      roleNames: ["EMPLOYEE"],
      permissionKeys: ["clients:read"],
    });
    const { user: empB } = await createUserAndLogin({ email: "emp-b@test.local", roleNames: ["EMPLOYEE"] });
    const clientB = await makeClient(adminToken, "Client B", empB.id);

    const res = await authed(empAToken).get(`/api/clients/${clientB.id}`);
    expect(res.status).toBe(404);
  });
});

describe("portal link validation", () => {
  let adminToken: string;

  beforeEach(async () => {
    ({ token: adminToken } = await createUserAndLogin({ email: "admin@test.local", roleNames: ["ADMIN"] }));
  });

  it("rejects linking a non-CLIENT-role user as portalUserId", async () => {
    const { user: employee } = await createUserAndLogin({ email: "emp@test.local", roleNames: ["EMPLOYEE"] });
    const res = await authed(adminToken).post("/api/clients", {
      name: "Bad Link",
      company: null,
      email: null,
      phone: null,
      address: null,
      notes: null,
      assignedUserId: null,
      portalUserId: employee.id,
    });
    expect(res.status).toBe(400);
  });

  it("rejects linking a portal user who is already linked to another client", async () => {
    const { user: portalUser } = await createUserAndLogin({ email: "client@test.local", roleNames: ["CLIENT"] });
    await makeClient(adminToken, "First Client", null, portalUser.id);

    const res = await authed(adminToken).post("/api/clients", {
      name: "Second Client",
      company: null,
      email: null,
      phone: null,
      address: null,
      notes: null,
      assignedUserId: null,
      portalUserId: portalUser.id,
    });
    expect(res.status).toBe(409);
  });
});
