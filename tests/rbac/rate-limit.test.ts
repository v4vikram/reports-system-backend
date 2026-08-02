import { describe, expect, it } from "vitest";
import { authed, createUserAndLogin } from "../helpers/fixtures.js";

// perUserRateLimit's limit is 200 requests / 5 min per user id. Deliberately
// using a user with no permissions at all — every request 403s, which is
// fine, since it's the rate limiter (not the permission check) under test
// here; a 429 is distinguishable from a 403 regardless.
describe("perUserRateLimit", () => {
  it("trips after the per-user limit, and doesn't affect a different user", async () => {
    const { token: hammeredToken } = await createUserAndLogin({
      email: "hammered@test.local",
      roleNames: ["EMPLOYEE"],
    });
    const { token: otherToken } = await createUserAndLogin({
      email: "bystander@test.local",
      roleNames: ["EMPLOYEE"],
    });

    let sawRateLimited = false;
    for (let i = 0; i < 205; i++) {
      const res = await authed(hammeredToken).get("/api/clients");
      if (res.status === 429) {
        sawRateLimited = true;
        break;
      }
      expect(res.status).toBe(403); // no clients:read — expected, not what's under test
    }
    expect(sawRateLimited).toBe(true);

    // A completely different user, well under their own limit, is unaffected.
    const bystanderRes = await authed(otherToken).get("/api/clients");
    expect(bystanderRes.status).toBe(403);
    expect(bystanderRes.status).not.toBe(429);
  });
});
