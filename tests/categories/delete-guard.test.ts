import { beforeEach, describe, expect, it } from "vitest";
import { authed, createUserAndLogin } from "../helpers/fixtures.js";

describe("category delete guard", () => {
  let adminToken: string;

  beforeEach(async () => {
    ({ token: adminToken } = await createUserAndLogin({ email: "admin@test.local", roleNames: ["ADMIN"] }));
  });

  it("blocks deleting a category that still has reports attached", async () => {
    const categoryRes = await authed(adminToken).post("/api/categories", {
      name: "Has Reports",
      parentId: null,
      description: null,
    });
    const category = categoryRes.body.data;

    const clientRes = await authed(adminToken).post("/api/clients", {
      name: "Client",
      company: null,
      email: null,
      phone: null,
      address: null,
      notes: null,
      assignedUserId: null,
      portalUserId: null,
    });
    const eventRes = await authed(adminToken).post("/api/events", {
      clientId: clientRes.body.data.id,
      title: "Event",
      description: null,
      eventDate: null,
    });
    await authed(adminToken).post("/api/reports", {
      eventId: eventRes.body.data.id,
      categoryId: category.id,
      title: "A report",
      content: null,
      assigneeUserIds: [],
    });

    const deleteRes = await authed(adminToken).delete(`/api/categories/${category.id}`);
    expect(deleteRes.status).toBe(409);
  });

  it("allows deleting a category with no reports attached", async () => {
    const categoryRes = await authed(adminToken).post("/api/categories", {
      name: "No Reports",
      parentId: null,
      description: null,
    });
    const deleteRes = await authed(adminToken).delete(`/api/categories/${categoryRes.body.data.id}`);
    expect(deleteRes.status).toBe(204);
  });
});
