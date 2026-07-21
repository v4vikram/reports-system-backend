import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { authed, createUserAndLogin } from "../helpers/fixtures.js";

describe("requireAuth", () => {
  it("rejects a request with no token at all", async () => {
    const res = await request(app).get("/api/clients");
    expect(res.status).toBe(401);
  });

  it("rejects a garbage bearer token", async () => {
    const res = await request(app).get("/api/clients").set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });
});

describe("requirePermission", () => {
  it("403s a logged-in user who lacks the required permission", async () => {
    const { token } = await createUserAndLogin({ email: "no-perms@test.local", roleNames: ["EMPLOYEE"] });
    const res = await authed(token).get("/api/clients");
    expect(res.status).toBe(403);
  });

  it("200s once the user is granted the exact permission the route requires", async () => {
    const { token } = await createUserAndLogin({
      email: "has-perm@test.local",
      roleNames: ["EMPLOYEE"],
      permissionKeys: ["clients:read"],
    });
    const res = await authed(token).get("/api/clients");
    expect(res.status).toBe(200);
  });

  it("has OR semantics across multiple listed keys (holding either is enough)", async () => {
    // GET /api/roles is gated on requirePermission(USERS_CREATE, USERS_UPDATE)
    // — holding just one of the two should already pass.
    const { token } = await createUserAndLogin({
      email: "or-semantics@test.local",
      roleNames: ["EMPLOYEE"],
      permissionKeys: ["users:update"],
    });
    const res = await authed(token).get("/api/roles");
    expect(res.status).toBe(200);
  });

  it("takes effect immediately on the next request after a permission is revoked", async () => {
    const { user, token } = await createUserAndLogin({
      email: "revoke-me@test.local",
      roleNames: ["EMPLOYEE"],
      permissionKeys: ["clients:read"],
    });
    expect((await authed(token).get("/api/clients")).status).toBe(200);

    const { prisma } = await import("../../src/lib/prisma.js");
    await prisma.userPermission.deleteMany({ where: { userId: user.id } });

    // Same still-valid access token — requirePermission re-reads from the DB
    // on every request rather than trusting a cached JWT claim, so this must
    // 403 without the user needing to log in again.
    const res = await authed(token).get("/api/clients");
    expect(res.status).toBe(403);
  });
});
